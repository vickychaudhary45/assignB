// const geoip = require("geoip-lite");

const { KnexB2BLms } = require("../config/db");

exports.creditPointTxn = async (txn_type, points, course_id, user_id) => {
  if (txn_type == "credit") {
    await KnexB2BLms("user_lms_credit_points").insert({
      user_id,
      txn_type,
      course_id,
      points,
    });

    return 1;
  } else if (txn_type == "withdraw") {
    if ((await this.points_balance(user_id)) >= points) {
      await KnexB2BLms("user_lms_credit_points").insert({
        txn_type,
        course_id,
        points,
        user_id,
      });
      return 1;
    } else {
      return 0;
    }
  } else if (transaction_type == "refund") {
  }
};

// used inside creditPointTxn
exports.points_balance = async (user_id) => {
  const point = await KnexB2BLms("user_lms_credit_points")
    .where("user_id", user_id)
    .where("txn_type", "credit")
    .sum("points")
    .first();

  const used_point = await KnexB2BLms("user_lms_credit_points")
    .where("user_id", user_id)
    .where("txn_type", "withdraw")
    .sum("points")
    .first();

  return point.sum - used_point.sum;
};
