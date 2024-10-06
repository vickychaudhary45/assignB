const { BadRequest } = require("../utils/errors");
const initializeConnections = require("../../../config/db");

exports.get = async (req, res, next) => {
    try {
        const { KnexB2BLms } = await initializeConnections();
        const { company_id } = req.query;
        if (!company_id) {
            throw new BadRequest("Company Id is missing.")
        }
        const userEmailNotificationStatus = await KnexB2BLms('corp_company')
            .select("is_send_notification", "email_subject", "email_template", "allow_password_email_template", 
                "password_generate_status", "password_generate_body", "password_generate_subject")
            .where({ id: company_id })
            .first();

        return res.status(200).json({
            status: true,
            message: userEmailNotificationStatus ? "User Email Notification Status." : "Company does not exist.",
            data: userEmailNotificationStatus ? userEmailNotificationStatus : {}
        })
    } catch (error) {
        return next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const { KnexB2BLms } = await initializeConnections();
        const {id, is_send_notification, email_subject, email_template, 
        password_generate_status, password_generate_body, password_generate_subject} = req.body;
        if (!id) {
            throw new BadRequest("Company Id is missing");
        }
        const corp_company = await KnexB2BLms("corp_company")
            .where("id", id)
            .first();
        if (!corp_company) {
            throw new BadRequest("Company not found");
        }
        const corp_company_preferences = {
            is_send_notification: is_send_notification || corp_company.is_send_notification,
            email_subject: email_subject || corp_company.email_subject,
            email_template: email_template || corp_company.email_template,
            allow_password_email_template: corp_company.allow_password_email_template, // value can't be updated by user ..if value is 1 password email notify section would be visible
            password_generate_status: password_generate_status || corp_company.password_generate_status,
            password_generate_body: password_generate_body || corp_company.password_generate_body,
            password_generate_subject: password_generate_subject || corp_company.password_generate_subject
        };
        const result = await KnexB2BLms("corp_company").where("id", id).update(corp_company_preferences).returning("id");

        return res.status(201).json({
            status: true,
            message: "Email preferences updated successfully",
            data: result
        });
    }
    catch (error) {
        return next(error);
    }
};