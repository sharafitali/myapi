const catchAsyncErrors = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/errorHandling");
const { User } = require("../models/userModel");
const OTP = require("../models/otpModel");
const { sendResponse } = require("../helpers/response");
const helperMessages = require("../helpers/englishMessages");
const { generatePassword, comparePassword } = require("../config/bcrypt");
const config = require("../config/config");
const sgMail = require("@sendgrid/mail");
const { Console } = require("winston/lib/winston/transports");
sgMail.setApiKey(config.SENDGRID_API_KEY);
const jwt = require("jsonwebtoken");

const createUser = catchAsyncErrors(async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      isTermsOfService,
      isPrivacyPolicy,
      phone,
    } = req.body;
    // Check if terms of service and privacy policy are accepted
    if (!isTermsOfService || !isPrivacyPolicy) {
      return sendResponse(res, 0, 400, helperMessages.AcceptTerms);
    }
    const previousAccounts = await User.find({ email: email.toLowerCase() });

    const softDeletedAccounts = previousAccounts.some(
      (account) => account.isDeleted
    );
    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (user || softDeletedAccounts) {
      return next(new ErrorHandler(helperMessages.userExists, 400));
    }
    const hashedPassword = await generatePassword(password);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
    });
    const accessTokenPayload = {
      userId: newUser.id,
    };
    const accessToken = jwt.sign(accessTokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpirationDays,
    });
    const refreshTokenPayload = {
      userId: newUser.id,
    };
    const refreshToken = jwt.sign(refreshTokenPayload, config.refresh.secret, {
      expiresIn: config.refresh.refreshExpirationDays,
    });

    const updatedUser = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
      { new: true }
    )
      .select("-password")
      .lean();

    const msg = {
      to: email,
      from: "naveed.nizami@zealtouch.org",
      subject: "Welcome to The OutBack",
      html: `
          <p>Hi there!</p>
          <p>Welcome to The OutBack! We're thrilled to have you on board.</p>
          <p>Best regards,<br/>The OutBack Team</p>
      `,
    };

    sgMail
      .send(msg)
      .then(() => console.log("Message sent successfully"))
      .catch((error) => console.log("Failed to send Message:", error));
    const responseData = {
      ...updatedUser,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
    return sendResponse(res, 1, 200, helperMessages.userCreated, responseData);
  } catch (error) {
    console.log(error);
    return sendResponse(res, 0, 400, error.message);
  }
});

const loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return sendResponse(res, 0, 400, helperMessages.userNotFound);
    }
    // Compare provided password with stored hashed password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return sendResponse(res, 0, 400, helperMessages.invalidCred);
    }
    const accessTokenPayload = {
      userId: user.id,
    };
    const accessToken = jwt.sign(accessTokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpirationDays,
    });
    const refreshTokenPayload = {
      userId: user.id,
    };
    const refreshToken = jwt.sign(refreshTokenPayload, config.refresh.secret, {
      expiresIn: config.refresh.refreshExpirationDays,
    });
    let updatedUser = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
      { new: true }
    )
      .select("-password")
      .lean();
    const sendResponseData = {
      ...updatedUser,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };

    return sendResponse(res, 1, 200, helperMessages.loggedIn, sendResponseData);
  } catch (error) {
    console.log(error);
    return sendResponse(res, 0, 500, error.message);
  }
});

// Function to generate 6-digit OTP
const generateOTP = () => {
  const min = 10000;
  const max = 99999;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

const socialSignup = catchAsyncErrors(async (req, res) => {
  const { email, name, socialId, platForm, phoneNo } = req.body;
  try {
    if (!platForm) {
      return sendResponse(res, 0, 400, "platform is required");
    }
    if (platForm === "firebase") {
      if (!email || !socialId || !name || !phoneNo ) {
        return sendResponse(res, 0, 400, helperMessages.MissingFields);
      }
    } else if (platForm === "apple") {
      if (!email || !socialId || !name ) {
        return sendResponse(res, 0, 400, helperMessages.MissingFields);
      }
    }else {
      return sendResponse(res, 0, 400, "Invalid platform");
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendResponse(res, 0, 400,helperMessages.userExists);
    }

    const newUser = new User({
      email,
      name,
      socialId,
      platForm,
      ...(platForm === 'firebase' && { phoneNo }),
    });
    await newUser.save();
    return sendResponse(res, 1, 200, helperMessages.userCreated, newUser);
  } catch (error) {
    console.error("Error saving user:", error);
    return;
  }
});

const socialLogin = catchAsyncErrors(async (req, res) => {
  const { email, platForm, socialId, phoneNo, name } = req.body;
  try {
    if (!platForm) {
      return sendResponse(res, 0, 400, "platform is required");
    }
    if (platForm === 'firebase') {
      if (!phoneNo || !socialId || !email ) {
        return sendResponse(res, 0, 400, helperMessages.MissingFields);
      }
    } else if (platForm === "apple") {
      if (!email || !socialId ) {
        return sendResponse(res, 0, 400, helperMessages.MissingFields);
      }
    } else {
      return sendResponse(res, 0, 400, "Invalid platform");
    }

    let user = await User.findOne({ email }).select('-password -socialId');
    let isNewUser = false;
    if (!user) {
      // User not found, create a new user
      const newUser = new User({
        email,
        name,
        socialId,
        platForm,
        ...(platForm === 'firebase' && { phoneNo }),
      });
      user = await newUser.save();
      isNewUser = true;
    }

    // Generate JWT tokens
    const accessTokenPayload = {
      userId: user.id,
    };
    const accessToken = jwt.sign(accessTokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpirationDays,
    });
    const refreshTokenPayload = {
      userId: user.id,
    };
    const refreshToken = jwt.sign(refreshTokenPayload, config.refresh.secret, {
      expiresIn: config.refresh.refreshExpirationDays,
    });

    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    await user.save();

    const sendResponseData = {
      ...user.toObject(),
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
    delete sendResponseData.socialId;
    if (isNewUser) {
      return sendResponse(res, 1, 200, helperMessages.userCreated, sendResponseData);
    } else {
      return sendResponse(res, 1, 200, helperMessages.loggedIn, sendResponseData);
    }
  } catch (error) {
    console.error("Error during social login:", error);
    return sendResponse(res, 0, 500, "Internal Server Error");
  }
});

// API endpoint for forgot password
const forgotPassword = catchAsyncErrors(async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return sendResponse(res, 0, 404, "User not found");
    }
    const otp = generateOTP();
    const newOTP = new OTP({
      userId: user._id,
      otp,
    });
    await newOTP.save();
    // Send OTP to user's email
    const msg = {
      to: email,
      from: "naveed.nizami@zealtouch.org",
      subject: "Password Reset OTP",
      html: `
          <p>Your OTP for password reset is: <strong>${otp}</strong></p>
      `,
    };
    console.log(msg);
    sgMail
      .send(msg)
      .then(() => console.log("otp sent successfully"))
      .catch((error) => console.log("Failed to send otp:", error));
    return sendResponse(res, 1, 200, "OTP sent to your email", {
      userId: user._id,
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    return sendResponse(res, 0, 500, error.message);
  }
});


const validateOTP = catchAsyncErrors(async (req, res) => {
  console.log("req.user:", req.user); // Add this line
  const { otp } = req.body;
  const userId = req.user.userId; // Extract userId from the authenticated user


  try {
    const otpEntry = await OTP.findOne({ userId, otp, status: "valid" });
    if (!otpEntry) {
      return sendResponse(res, 0, 400, "Invalid or expired OTP");
    }
    // Check if OTP has expired
    if (Date.now() - otpEntry.createdAt.getTime() > 60000) {
      // 1 minute in milliseconds
      otpEntry.status = "expired";
      await otpEntry.save();
      return sendResponse(res, 0, 400, "OTP has expired");
    }

    return sendResponse(res, 1, 200, 'OTP validated successfully');
  } catch (error) {
    console.error('Error in validateOTP:', error);
    return sendResponse(res, 0, 500, error.message);
  }
});


const resetPassword = catchAsyncErrors(async (req, res) => {
  const { email,newPassword,reEnterPassword } = req.body;

  try {
    // Hash the new password
    const hashedPassword = await generatePassword(newPassword, 10);
    const reEnterPasswordHashed = await generatePassword(reEnterPassword, 10);
    // Update user's password
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword, reEnterPassword: reEnterPasswordHashed },
      { new: true }
    )

    if (!updatedUser) {
      return sendResponse(res, 0, 404, 'User not found');
    }
    return sendResponse(res, 1, 200, 'Password has been reset successfully');
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return sendResponse(res, 0, 500, error.message);
  }
});


// const resetPassword = catchAsyncErrors(async (req, res) => {
//   const { userId, otp, newPassword } = req.body;

//   try {
//     const otpEntry = await OTP.findOne({ userId, otp, status: "valid" });
//     if (!otpEntry) {
//       return sendResponse(res, 0, 400, "Invalid or expired OTP");
//     }
//     // Check if OTP has expired
//     if (Date.now() - otpEntry.createdAt.getTime() > 60000) {
//       // 1 minute in milliseconds
//       otpEntry.status = "expired";
//       await otpEntry.save();
//       return sendResponse(res, 0, 400, "OTP has expired");
//     }
//     // Hash the new password
//     const hashedPassword = await generatePassword(newPassword, 10);
//     // Update user's password
//     await User.findByIdAndUpdate(userId, { password: hashedPassword });

//     // Invalidate the OTP
//     otpEntry.status = "expired";
//     await otpEntry.save();
//     return sendResponse(res, 1, 200, "Password has been reset successfully");
//   } catch (error) {
//     console.error("Error in resetPassword:", error);
//     return sendResponse(res, 0, 500, error.message);
//   }
// });

module.exports = {
  createUser,
  loginUser,
  forgotPassword,
  resetPassword,
  socialSignup, 
  socialLogin,
  validateOTP

};
