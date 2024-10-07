const { BadRequest } = require("../utils/errors");
const initializeConnections = require("../../../config/db");

exports.dashboardCounts = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const { company_id } = req.query;
    if (!company_id) {
      throw new BadRequest("company_id not found");
    }
    const totalUser = await Promise.all([
      KnexB2BLms("users")
        .count("id as users_count")
        .where("company_id", company_id)
        .first(),
    ]);

    return res.status(200).json({
      status: true,
      message: "Dashboard counts retrieved successfully.",
      totalUser: totalUser[0]?.users_count,
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateFeedbackForm = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const { userId, company_id, ratings, suggestion, submitted_at } = req.body;

    if (
      !userId ||
      !company_id ||
      !ratings.length ||
      !suggestion.length ||
      !submitted_at
    ) {
      throw new BadRequest(
        "Incomplete request body or some request parameters not found"
      );
    }

    // Insert new feedback data
    const data = await KnexB2BLms("user_feedbacks")
      .insert({
        submitted_at: submitted_at,
        user_id: userId,
        suggestion: suggestion,
        rating: JSON.stringify(ratings),
        company_id: company_id,
        status: true, // Assuming you want to set the status to true on insert
        created_at: new Date(),
      })
      .returning("*");

    return res.status(201).json({
      data: data,
      status: "success",
      message: "Feedback submitted successfully.",
    });
  } catch (error) {
    return next(error);
  }
};


exports.getFeedbackFormData = async (req, res, next) => {
  try {
    const { KnexB2BLms } = await initializeConnections();
    const { company_id } = req.body; // Assuming company_id is sent in the request

    if (!company_id) {
      throw new BadRequest("Company Id is missing.");
    }

    const feedbackData = await KnexB2BLms("user_feedbacks as uf")
      .join("users as u", "uf.user_id", "u.id") // Join with the users table
      .select(
        "uf.*", // Select all columns from user_feedbacks
        "u.email" // Select the email column from users
      )
      .where("uf.company_id", company_id)
      .andWhere("uf.status", true) // Assuming you want only active feedbacks
      .orderBy("uf.submitted_at", "desc"); // You can modify the order as needed

    if (feedbackData.length === 0) {
      return res.status(404).json({
        status: "success",
        message: "No feedback found for this company.",
        data: [],
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Feedback data retrieved successfully.",
      data: feedbackData,
    });
  } catch (error) {
    return next(error);
  }
};

