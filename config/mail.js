const sgMail = require("@sendgrid/mail");
require('dotenv').config();
const initializeConnections = require("../config/db");

const moment = require("moment");

const templates = {
  default_template: "d-afd34a717da841108885c7b341ebecc6",
};
const whiteLabelTemplates = {
  wl_enroll_template: "d-1d787117fa154764b0a2e5179890d3d2",
  wl_rp_template: "d-c20109e4b0e3496699832dd9b6e58fb6",
  wl_adduser_template: "d-bacdd43bddf640f4af66abe2aa47b355",
};

async function checkWhitelabelStatusByEmail(email){
  const { KnexB2BLms } = await initializeConnections();
  const companyInfo = await KnexB2BLms('corp_company as cc').join('users as u','cc.id','u.company_id').where('u.email', 'iLike', email)
  .select('allow_whitelabeling').first();
  return companyInfo
}

exports.sendUserAddEmail = async (data) => {
  const {ApplicationSecret} = await initializeConnections();
  sgMail.setApiKey(ApplicationSecret.configuration.secret.SENDGRID_API_KEY);
  const d = new Date();
  const year = d.getFullYear();
  const BASE_URL = ApplicationSecret.configuration.secret.FRONT_URL;
  let dynamic_template_data = data.dynamic_template_data;
  dynamic_template_data.b2bemailtitle = "Welcome to Whizlabs Business";
  dynamic_template_data.b2bemailbody = data.emailbody;
  dynamic_template_data.copyright_year = year;
  dynamic_template_data.BASE_URL = BASE_URL;
  dynamic_template_data.S3_PATH = ApplicationSecret.configuration.secret.S3_EMAIL_PATH;

  const msg = {
    from: {
      email: 'Whizlabs Business <support@whizlabs.com>',
    },
    personalizations: [
      {
        to: [
          {
            email: data.email,
          },
        ],
        dynamic_template_data: dynamic_template_data,
      },
    ],
    template_id: templates[data.templateName],
  };

  msg.headers = { Priority: "Urgent", Importance: "high" };

  //send the email
  let mailstatus = await Promise.resolve(
    sgMail.send(msg, (error, result) => {
      if (error) {
        return false;
      } else {
        return true;
      }
  }));
  return mailstatus;
  
};

exports.sendMailToUsers = async (data) => {
  const { KnexB2BLms, ApplicationSecret } = await initializeConnections();
  sgMail.setApiKey(ApplicationSecret.configuration.secret.SENDGRID_API_KEY);
  const d = new Date();
  const year = d.getFullYear();
  const BASE_URL = ApplicationSecret.configuration.secret.FRONT_URL;
  let templateName = "default_template";
  const company = await KnexB2BLms('corp_company').where('id', data.company_id)
    .select('is_send_notification ', 'email_template', 'email_subject', 'id').first();
  if (!company?.is_send_notification) {
    return;
  }
  let courselist = '';
  let subcriptionlist = '';
  let learningPathlist = '';
  let teamslist = '';
  let text = 'Course(s)/Subscription(s)/Learning Paths(s)'
  if (data.courses?.length > 0) {
    courselist = await Promise.all(data.courses.map(async (course) => {
     let courseType;
     if (course.product_type === "FT") {
       courseType = "Free Test";
     }else if(course.product_type === "PT"){
      courseType ="Practice Test" ;
     }else if (course.product_type === "OC") {
       courseType = "Video course";
     }else if(course.product_type === "LAB"){
       courseType ="Lab";
     }else if(course.product_type === "SANDBOX"){
      courseType = "Sandbox";
     } else {
       courseType = course.product_type; 
     }
     return `<li>${course.title} - ${courseType}</li>`;
    }));
    courselist=courselist.join('');
  }
  if (data.subscriptions?.length > 0) {
    subcriptionlist = await data.subscriptions.map(subscription => '<li>' + subscription.title + '</li>').join(' ')
  }
  if (data.learningPaths?.length > 0) {
    text = 'Learning Path(s)';
    learningPathlist = await data.learningPaths.map(lp => '<li>' + lp.title + '</li>').join(' ')
  }
  if (data.teams?.length > 0) {
    text = 'Team(s)';
    teamslist = await data.teams.map(team => '<li>' + team.title + '</li>').join(' ')
  }
  let emailbodyCourses = '<ul>' + courselist;
  let emailbodySubscription = subcriptionlist;
  let emailbodyLp = learningPathlist;
  let emailbodyTeam = teamslist + '</ul><br>';
  let emailbody;
  for (const user of data.users) {
    emailbody = 'Hi ' + user.firstname + ',<br><br> ';
    emailbody += company.email_template ? company.email_template  : 'Congratulations! You have been assigned below' + text + 'in Whizlabs under Whizcorp portal.<br>';
    emailbody += emailbodyCourses + emailbodySubscription + emailbodyLp + emailbodyTeam;
    emailbody += 'You can access assigned courses by signing in from below link. <br><br> <a href="https://business.whizlabs.com/login">https://business.whizlabs.com/login</a>';

    let mail_data = {
      templateName: templateName,
      to: user.email,
      emailbody: emailbody,
      dynamic_template_data: {
        subject: company.email_subject ? company.email_subject : "Whizlabs Business: Course assign mail",
      },
    };

    let dynamic_template_data = mail_data.dynamic_template_data;
    dynamic_template_data.b2bemailtitle = data.mail_title;
    dynamic_template_data.b2bemailbody = mail_data.emailbody;
    dynamic_template_data.copyright_year = year;
    dynamic_template_data.BASE_URL = BASE_URL;
    dynamic_template_data.S3_PATH = ApplicationSecret.configuration.secret.S3_EMAIL_PATH;
    const msg = {
      from: {
        email: mail_data.from ? mail_data.from : 'Whizlabs Business <support@whizlabs.com>',
      },
      personalizations: [
        {
          to: [
            {
              email: user.email,
            },
          ],
          dynamic_template_data: dynamic_template_data,
        },
      ],
      template_id: templates[mail_data.templateName],
    };

    msg.headers = { Priority: "Urgent", Importance: "high" };

    //send the email
    let mailstatus = await Promise.resolve(
      sgMail.send(msg, (error, result) => {
        if (error) {
          return false;
        } else {
          return true;
        }
      })
    );
  }
}

exports.sendForgetPasswordEmail = async (firstname, email, resetLink) => {
  const {ApplicationSecret} = await initializeConnections();
  sgMail.setApiKey(ApplicationSecret.configuration.secret.SENDGRID_API_KEY);
  const d = new Date();
  const year = d.getFullYear();
  const BASE_URL = ApplicationSecret.configuration.secret.FRONT_URL;

  let mail_data = {
    templateName: "default_template",
    to: email,
    emailbody: 'Hi ' + firstname + ',  <br><br> You requested us to reset password. Please <a href="' + resetLink + '">click here</a> to reset password. <br><br> If you cannot click the link, you can copy given link below and access it to change your password: <br> ' + resetLink,
    dynamic_template_data: {
      subject: "Whizlabs Business: Forgot Password mail",
    },
  };

  let dynamic_template_data = mail_data.dynamic_template_data;
  dynamic_template_data.b2bemailtitle = "Forgot Password";
  dynamic_template_data.b2bemailbody = mail_data.emailbody;
  dynamic_template_data.copyright_year = year;
  dynamic_template_data.BASE_URL = BASE_URL;
  dynamic_template_data.S3_PATH = ApplicationSecret.configuration.secret.S3_EMAIL_PATH;

  const msg = {
    from: {
      email: 'Whizlabs Business <support@whizlabs.com>',
    },
    personalizations: [
      {
        to: [
          {
            email: mail_data.to,
          },
        ],
        dynamic_template_data: dynamic_template_data,
      },
    ],
    template_id: templates[mail_data.templateName],
  };

  msg.headers = { Priority: "Urgent", Importance: "high" };
  //send the email
  let mailstatus = await Promise.resolve(
    sgMail.send(msg, (error, result) => {
      if (error) {
        return false;
      } else {
        return true;
      }
    }));

  return mailstatus;
};

exports.LeadGenerationNotification = async(data) => {
  const {ApplicationSecret} = await initializeConnections();
  sgMail.setApiKey(ApplicationSecret.configuration.secret.SENDGRID_API_KEY);
  toemails = ["contact@whizlabs.com"];

  for(i = 0; i < toemails.length; i++) {
    let user = toemails[i];
    const msg = {
    to: user,
    from: 'Whizlabs Business <support@whizlabs.com>',
    subject: `New B2B lead created : ${data.from}`,
    html: '<strong>Hi Team <br /> New Lead has been Generated</strong>',
  };
  msg.headers = { Priority: "Urgent", Importance: "high" };

   let mailstatus = await Promise.resolve(
    sgMail.send(msg, (error, result) => {
      if (error) {
        return false;
      } else {
        return true;
      }
    }));
    return mailstatus ;
  }
  return "success";
};

exports.sendMeetingScheduledEmail=async(data)=>{
  const {ApplicationSecret} = await initializeConnections();
  sgMail.setApiKey(ApplicationSecret.configuration.secret.SENDGRID_API_KEY);
  const date = moment(data.event_date).add(330, "minutes").format("DD-MM-YYYY");
  const time = moment(data.event_time).add(330, "minutes").format("LT");

  const meetingLink=data.meeting_link;
  const d = new Date();
  const year = d.getFullYear();
  const BASE_URL = ApplicationSecret.configuration.secret.FRONT_URL;
  let templateName = "default_template";
  let emailbody = 'Dear' + ' '+ data.name + ',<br><br> ';
  emailbody += "Thank you for scheduling a demo with Whizlabs. We'll showcase our platform and discuss how our services can cater to your specific needs .<br> <br> ";
  emailbody += "During the demo, we'll provide an in-depth overview of our offerings, including IT certification courses, labs, and practice tests, empowering your team with essential skills. <br>"
  emailbody += '<strong>Demo Details :  </strong>  Date :  ' + date + ' Time : ' + time +'(IST)'+  ' <br>' 
  emailbody += `<strong>Meeting Link :</strong> ${meetingLink} `
  emailbody += '<p>  If you have specific topics to cover during the demo, please let us know. We value your time and assure you a tailored session.</p> <br>'
  // emailbody += `<p>  If you would like to reschedule, please use this link.${meetingLink} .</p><br>`
  emailbody += 'Thank you for choosing Whizlabs. We look forward to meeting you. <br><br>';
  emailbody += '<strong>Best Regards, </strong> <br> Whizlabs Team'
  let mail_data = {
    templateName: templateName,
    to: data.email,
    emailbody: emailbody,
    dynamic_template_data: {
      subject: "Whizlabs Demo Appointment Scheduled",
    },
  };
  let dynamic_template_data = mail_data.dynamic_template_data;
  dynamic_template_data.b2bemailtitle = 'Whizlabs LMS Demo Appointment';
  dynamic_template_data.b2bemailbody = mail_data.emailbody;
  dynamic_template_data.copyright_year = year;
  dynamic_template_data.BASE_URL = BASE_URL;
  dynamic_template_data.S3_PATH = ApplicationSecret.configuration.secret.S3_EMAIL_PATH;

  const msg = {
    from: {
      email: mail_data.from ? mail_data.from : 'Whizlabs Business <support@whizlabs.com>',
    },
    personalizations: [
      {
        to: [
          {
            email: data.email,
          },
        ],
        dynamic_template_data: dynamic_template_data,
      },
    ],
    template_id: templates[mail_data.templateName],
  };
  msg.headers = { Priority: "Urgent", Importance: "high" };

  let mailstatus = await Promise.resolve(
   sgMail.send(msg, (error, result) => {
     if (error) {
       return false;
     } else {
       return true;
     }
   }));
   return mailstatus ;
};

exports.sendMailToTeams = async (data) => {
  const { KnexB2BLms, ApplicationSecret } = await initializeConnections();
  sgMail.setApiKey(ApplicationSecret.configuration.secret.SENDGRID_API_KEY);
  const d = new Date();
  const year = d.getFullYear();
  const BASE_URL = ApplicationSecret.configuration.secret.FRONT_URL;
  const MEDIA_URL = ApplicationSecret.configuration.secret.S3_EMAIL_PATH;
  let templateName = "default_template";

  const team = await KnexB2BLms('support_ticket_team')
      .where('team_name', data.type)
      .select('team_email')
      .first();

  if (!team?.team_email) {
    return;
  }

    let s3MediaURL = MEDIA_URL + 'b2b/support-query-uploads/' + data.attachment_path;
    let emailbody = 'Hi ' + data.type + ' Team' + ',<br><br> ';
    emailbody += data.company_name + ' raise a ticket regarding ' + data.type + '.<br> ';
    emailbody += 'Username: ' + data.email + '.<br> ';
    emailbody += 'Title: ' + data.title + '.<br> ';
    emailbody += 'Description: ' + data.description + '.<br><br>';
    emailbody += data.attachment_path
    ? `
        <img style="max-width: 300px; height: auto; display: block; margin: 0 auto;" alt="reference image" src="${s3MediaURL}" /> <br>`
    : "";
    emailbody += `Or download the image from here <br>${s3MediaURL} <br><br>`;
    emailbody += 'You can check the query details in assist by signing in from below link. <br><br>https://assist.whizlabs.net/dashboard/b2b/support-ticket';

    let mail_data = {
      templateName: templateName,
      to: team?.team_email,
      emailbody: emailbody,
      dynamic_template_data: {
        subject: `Ticket rasied from ${data.company_name}`,
      },
    };

    let dynamic_template_data = mail_data.dynamic_template_data;
    dynamic_template_data.b2bemailtitle = `Ticket Details`;
    dynamic_template_data.b2bemailbody = mail_data.emailbody;
    dynamic_template_data.copyright_year = year;
    dynamic_template_data.BASE_URL = BASE_URL;
    dynamic_template_data.S3_PATH = ApplicationSecret.configuration.secret.S3_EMAIL_PATH;

    const msg = {
      from: {
        email: mail_data.from ? mail_data.from : 'Whizlabs Business <support@whizlabs.com>',
      },
      personalizations: [
        {
          to: [
            {
              email: team?.team_email,
            },
          ],
          dynamic_template_data: dynamic_template_data,
        },
      ],
      template_id: templates[mail_data.templateName],
    };

    msg.headers = { Priority: "Urgent", Importance: "high" };
    
    //send the email
    let mailstatus = await Promise.resolve(
    sgMail.send(msg, (error, result) => {
      if (error) {
        return false;
      } else {
        return true;
      }
    }));
  return mailstatus;
};

exports.sendMailToQrUser = async (data) => {
  const { KnexB2BLms, ApplicationSecret } = await initializeConnections();
  sgMail.setApiKey(ApplicationSecret.configuration.secret.SENDGRID_API_KEY);
  const d = new Date();
  const year = d.getFullYear();
  const BASE_URL = ApplicationSecret.configuration.secret.FRONT_URL;
  let templateName = "default_template";
  const company = await KnexB2BLms('corp_company').where('id', data.company_id)
    .select('is_send_notification ', 'email_template', 'id').first();

  if (!company?.is_send_notification) {
    return;
  }

  if (data.subscriptions?.length > 0) {
    subcriptionlist = await data.subscriptions.map(subscription => '<li>' + subscription.title + '</li>').join(' ')
  }
  for (i = 0; i < data.users?.length; i++) {
    let user = data.users[i];
    let emailbody = 'Hello ' + user.firstname + ',<br><br> ';
    if(data.company_id == 1119){
      emailbody += `Congratulations! You've been granted the "Premium Plus" subscription on Whizlabs, `;
      emailbody += `valid for one month, as a bonus for your purchase of the cloud career journey book.<br><br>`;
    }
    else if(data.company_id == 1172){
      emailbody += `We're thrilled to announce that you've been granted with one-month Whizlabs "Premium Plus" subscription for evaluation!, `;
      // emailbody += `Thanks for meeting us at the AWS Community Day event 2024. <br><br>`;
    }
    else if(data.company_id == 1300){
      emailbody += `Congratulations! You've been granted the ${data.subscription_for} subscription valid for three months! `;
      // emailbody += `Thanks for meeting us at the AWS Community Day event 2024. <br><br>`;
    }
    else{
      emailbody += `Congratulations! You've been granted the "Premium Plus" subscription on Whizlabs, `;
      emailbody += `valid for one month.<br><br>`;
    }
   
    emailbody += 'To access your subscription, please sign in using the link below. <br><br> <a href="https://business.whizlabs.com/login">https://business.whizlabs.com/login</a>';

    let mail_data = {
      templateName: templateName,
      to: user.email,
      emailbody: emailbody,
      dynamic_template_data: {
        subject: "Whizlabs Business: Subscription assign mail",
      },
    };

    let dynamic_template_data = mail_data.dynamic_template_data;
    dynamic_template_data.b2bemailtitle = data.mail_title;
    dynamic_template_data.b2bemailbody = mail_data.emailbody;
    dynamic_template_data.copyright_year = year;
    dynamic_template_data.BASE_URL = BASE_URL;
    dynamic_template_data.S3_PATH = ApplicationSecret.configuration.secret.S3_EMAIL_PATH;
    const msg = {
      from: {
        email: mail_data.from ? mail_data.from : 'Whizlabs Business <support@whizlabs.com>',
      },
      personalizations: [
        {
          to: [
            {
              email: user.email,
            },
          ],
          dynamic_template_data: dynamic_template_data,
        },
      ],
      template_id: templates[mail_data.templateName],
    };

    msg.headers = { Priority: "Urgent", Importance: "high" };
    //send the email
    let companyInfo = await checkWhitelabelStatusByEmail(user.email);
    if(!companyInfo?.allow_whitelabeling){
      let mailstatus = await Promise.resolve(
        sgMail.send(msg, (error, result) => {
          if (error) {
            return false;
          } else {
            return true;
          }
        })
      );
    } else {
      return true;
    }
  }
}

// leads module email verification
exports.sendEmailVerfication = async (email, emailVerifyLink) => {
  const {ApplicationSecret} = await initializeConnections();
  sgMail.setApiKey(ApplicationSecret.configuration.secret.SENDGRID_API_KEY);
  const d = new Date();
  const year = d.getFullYear();
  const BASE_URL = ApplicationSecret.configuration.secret.FRONT_URL;

  let mail_data = {
    templateName: "default_template",
    to: email,
    emailbody: 'Hi,  <br><br> You requested us to email verfication. Please <a href="' + emailVerifyLink + '">click here</a> to email verification. <br><br> If you cannot click the link, you can click the given direct link below and to verify your email: <br> ' + emailVerifyLink,
    dynamic_template_data: {
      subject: "Whizlabs Business: Email Verification.",
    },
  };

  let dynamic_template_data = mail_data.dynamic_template_data;
  dynamic_template_data.b2bemailtitle = "Email Verification";
  dynamic_template_data.b2bemailbody = mail_data.emailbody;
  dynamic_template_data.copyright_year = year;
  dynamic_template_data.BASE_URL = BASE_URL;
  dynamic_template_data.S3_PATH = ApplicationSecret.configuration.secret.S3_EMAIL_PATH;

  const msg = {
    from: {
      email: mail_data.from ? mail_data.from : 'Whizlabs Business <support@whizlabs.com>',
    },
    personalizations: [
      {
        to: [
          {
            email: mail_data.to,
          },
        ],
        dynamic_template_data: dynamic_template_data,
      },
    ],
    template_id: templates[mail_data.templateName],
  };

  msg.headers = { Priority: "Urgent", Importance: "high" };
  //send the email
  let mailstatus = await Promise.resolve(
    sgMail.send(msg, (error, result) => {
      if (error) {
        return false;
      } else {
        return true;
      }
    }));

  return mailstatus;
};

exports.sendUserAddEmailWhiteLabel = async (data) => {
  const {ApplicationSecret} = await initializeConnections();
  sgMail.setApiKey(ApplicationSecret.configuration.secret.SENDGRID_API_KEY);
  const d = new Date();
  const year = d.getFullYear();
  const BASE_URL = ApplicationSecret.configuration.secret.FRONT_URL;
  let mail_data = {
    templateName: "wl_adduser_template",
    email: data.email.toLowerCase(),
    from: data.company_name + ' ' + data.sender_email ? data.sender_email : '<support@whizlabs.com>',
    emailbody: `<p>Hi ${data.firstname} ${data.lastname},</p>
          <p>Welcome to ${data.company_name}. </p>
          <p>Your account has been created successfully. </p>
          <p>Please find your credentials below:</p>
          <p>URL: ${BASE_URL}login/${data.slug} <p>
          <p>Username: ${data.email.toLowerCase()}</p>

          You can set up your account password by clicking on the link below: <br>
          <a href="${data.resetLink}">${data.resetLink}</a>
          <p>Thanks,</p>
          <p>${data.company_name} Team</p>`,
    dynamic_template_data: {
      subject: `Welcome to ${data.company_name}`,
    },
  };
  let dynamic_template_data = mail_data.dynamic_template_data;
  dynamic_template_data.b2bemailtitle = `Welcome to ${data.company_name}`;
  dynamic_template_data.b2bemailbody = mail_data.emailbody;
  dynamic_template_data.copyright_year = year;
  dynamic_template_data.BASE_URL = BASE_URL;
  dynamic_template_data.S3_PATH = ApplicationSecret.configuration.secret.S3_EMAIL_PATH;
  dynamic_template_data.REPLACE_COMPANY_NAME = data.company_name;
  dynamic_template_data.WHITELABLE_IMG = data.profile_pic;
  dynamic_template_data.SLUG = data.slug;
  dynamic_template_data.WHITELABLE_SUPPORT_EMAIL = data.sender_email;
  
  const msg = {
    from: {
      email: mail_data.from ? mail_data.from : `${data.company_name}  <support@whizlabs.com>`,
    },
    personalizations: [
      {
        to: [
          {
            email: mail_data.email,
          },
        ],
        dynamic_template_data: dynamic_template_data,
      },
    ],
    template_id: whiteLabelTemplates[mail_data.templateName],
  };

  msg.headers = { Priority: "Urgent", Importance: "high" };

  //send the email
  let mailstatus = await Promise.resolve(
    sgMail.send(msg, (error, result) => {
      if (error) {
        return false;
      } else {
        return true;
      }
  }));
  return mailstatus;
};

exports.sendForgetPasswordEmailWhiteLabel = async (data) => {
  const {ApplicationSecret} = await initializeConnections();
  sgMail.setApiKey(ApplicationSecret.configuration.secret.SENDGRID_API_KEY);
  const d = new Date();
  const year = d.getFullYear();
  const BASE_URL = ApplicationSecret.configuration.secret.FRONT_URL;

  let mail_data = {
    templateName: "wl_rp_template",
    to: data.email,
    from: data.company_name + ' ' + data.sender_email ? data.sender_email : '<support@whizlabs.com>',
    emailbody: 'Hi ' + data.firstname + ',  <br><br> You requested us to reset password. Please <a href="' + data.resetLink + '">click here</a> to reset password. <br><br> If you cannot click the link, you can copy given link below and access it to change your password: <br> ' + data.resetLink,
    dynamic_template_data: {
      subject: `${data.company_name}: Forgot Password mail`,
    },
  };

  let dynamic_template_data = mail_data.dynamic_template_data;
  dynamic_template_data.b2bemailtitle = "Forgot Password";
  dynamic_template_data.b2bemailbody = mail_data.emailbody;
  dynamic_template_data.copyright_year = year;
  dynamic_template_data.BASE_URL = BASE_URL;
  dynamic_template_data.S3_PATH = ApplicationSecret.configuration.secret.S3_EMAIL_PATH;
  dynamic_template_data.REPLACE_COMPANY_NAME = data.company_name;
  dynamic_template_data.WHITELABLE_IMG = data.profile_pic;
  dynamic_template_data.SLUG = data.slug;
  dynamic_template_data.WHITELABLE_SUPPORT_EMAIL = data.sender_email;
  dynamic_template_data.firstname = data.firstname;
  dynamic_template_data.resetLink = data.resetLink;

  const msg = {
    from: {
      email: mail_data.from ? mail_data.from : `${data.company_name} <support@whizlabs.com>`,
    },
    personalizations: [
      {
        to: [
          {
            email: mail_data.to,
          },
        ],
        dynamic_template_data: dynamic_template_data,
      },
    ],
    template_id: whiteLabelTemplates[mail_data.templateName],
  };

  msg.headers = { Priority: "Urgent", Importance: "high" };
  //send the email
  let mailstatus = await Promise.resolve(
    sgMail.send(msg, (error, result) => {
      if (error) {
        return false;
      } else {
        return true;
      }
    }));

  return mailstatus;
};

exports.sendMailToUsersWhiteLabel = async (data) => {
  const { KnexB2BLms, ApplicationSecret } = await initializeConnections();
  sgMail.setApiKey(ApplicationSecret.configuration.secret.SENDGRID_API_KEY);
  const d = new Date();
  const year = d.getFullYear();
  const BASE_URL = ApplicationSecret.configuration.secret.FRONT_URL;
  let templateName = "wl_enroll_template";
  const company = await KnexB2BLms('corp_company').where('id', data.company_id)
    .select('is_send_notification ', 'email_template', 'email_subject', 'id', 'login_page_slug', 'company_name', 'profile_pic', 'sender_email').first();
  if (!company?.is_send_notification) {
    return;
  }
  let courselist = '';
  let subcriptionlist = '';
  let learningPathlist = '';
  let teamslist = '';
  let text = 'Course(s)/Subscription(s)/Learning Paths(s)'
  if (data.courses?.length > 0) {
    text = 'Course(s)';
    courselist = await Promise.all(data.courses.map(async (course) => {
     let courseType;
     if (course.product_type === "FT") {
       courseType = "Free Test";
     }else if(course.product_type === "PT"){
      courseType ="Practice Test" ;
     }else if (course.product_type === "OC") {
       courseType = "Video course";
     }else if(course.product_type === "LAB"){
       courseType ="Lab";
     }else if(course.product_type === "SANDBOX"){
      courseType = "Sandbox";
     } else {
       courseType = course.product_type; 
     }
     return `<li>${course.title} - ${courseType}</li>`;
    }));
    courselist=courselist.join('');
  }
  if (data.subscriptions?.length > 0) {
    text = 'Subscription(s)';
    subcriptionlist = await data.subscriptions.map(subscription => '<li>' + subscription.title + '</li>').join(' ')
  }
  if (data.learningPaths?.length > 0) {
    text = 'Learning Path(s)';
    learningPathlist = await data.learningPaths.map(lp => '<li>' + lp.title + '</li>').join(' ')
  }
  if (data.teams?.length > 0) {
    text = 'Team(s)';
    teamslist = await data.teams.map(team => '<li>' + team.title + '</li>').join(' ')
  }
  let emailbodyCourses = '<ul>' + courselist;
  let emailbodySubscription = subcriptionlist;
  let emailbodyLp = learningPathlist;
  let emailbodyTeam = teamslist + '</ul><br>';
  let emailbody;
  for (const user of data.users) {
    emailbody = 'Hi ' + user.firstname + ',<br><br> ';
    emailbody += company.email_template ? company.email_template  : 'Congratulations! You have been assigned below' + text + `in ${company.company_name} under the portal.<br>`;
    emailbody += emailbodyCourses + emailbodySubscription + emailbodyLp + emailbodyTeam;
    emailbody += `You can access assigned courses by signing in from below link. <br><br> <a href="https://business.whizlabs.com/login/${company.login_page_slug}">https://business.whizlabs.com/login/${company.login_page_slug}</a>`;

    let mail_data = {
      templateName: templateName,
      to: user.email,
      from: company.company_name + ' ' + company.sender_email ? company.sender_email : '<support@whizlabs.com>',
      emailbody: emailbody,
      dynamic_template_data: {
        subject: company.email_subject ? company.email_subject : `${company.company_name}: Course assign mail`,
      },
    };

    let dynamic_template_data = mail_data.dynamic_template_data;
    dynamic_template_data.b2bemailtitle = data.mail_title;
    dynamic_template_data.b2bemailbody = mail_data.emailbody;
    dynamic_template_data.copyright_year = year;
    dynamic_template_data.BASE_URL = BASE_URL;
    dynamic_template_data.S3_PATH = ApplicationSecret.configuration.secret.S3_EMAIL_PATH;
    dynamic_template_data.REPLACE_COMPANY_NAME = company.company_name;
    dynamic_template_data.WHITELABLE_IMG = company.profile_pic;

    const msg = {
      from: {
        email: mail_data.from ? mail_data.from : `${company.company_name} <support@whizlabs.com>`,
      },
      personalizations: [
        {
          to: [
            {
              email: user.email,
            },
          ],
          dynamic_template_data: dynamic_template_data,
        },
      ],
      template_id: whiteLabelTemplates[mail_data.templateName],
    };

    msg.headers = { Priority: "Urgent", Importance: "high" };
    //send the email
    let mailstatus = await Promise.resolve(
      sgMail.send(msg, (error, result) => {
        if (error) {
          return false;
        } else {
          return true;
        }
      })
    );
  }
}
  