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
    const data = await KnexB2BLms("client_user_feedbacks")
      .where("company_id", company_id)
      .andWhere("status", false)
      .update({
        submitted_at: submitted_at,
        user_id: userId,
        suggestion: suggestion,
        rating: JSON.stringify(ratings),
        status: true,
      })
      .returning("*");

    return res.status(200).json({
      data: data,
      status: "success",
      message: "Update successfully.",
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
    const data = await KnexB2BLms("client_user_feedbacks")
      .where("company_id", company_id)
      .andWhere("status", false)
      .update({
        submitted_at: submitted_at,
        user_id: userId,
        suggestion: suggestion,
        rating: JSON.stringify(ratings),
        status: true,
      })
      .returning("*");

    return res.status(200).json({
      data: data,
      status: "success",
      message: "Update successfully.",
    });
  } catch (error) {
    return next(error);
  }
};
