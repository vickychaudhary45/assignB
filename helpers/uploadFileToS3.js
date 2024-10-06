require('dotenv').config();
const AWS = require('aws-sdk');
const initializeConnections = require("../config/db");

exports.uploadToS3 = async(file, directory, originalFilename) => {
  const { ApplicationSecret } = await initializeConnections();
  const s3 = new AWS.S3({
    accessKeyId: ApplicationSecret.configuration.secret.S3_KEY,
    secretAccessKey: ApplicationSecret.configuration.secret.S3_SECRET,
    region: ApplicationSecret.configuration.secret.S3_REGION,
  });

  if (typeof file !== 'string') {
    throw new Error('File is not a string');
  }

const base64Data = String(file).replace(/^data:image\/\w+;base64,/, "");
const decodedFile = Buffer.from(base64Data, 'base64');
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: `${ApplicationSecret.configuration.secret.S3_BUCKET}/${directory}`,
      Key: `${originalFilename}`,
      Body: decodedFile,
      ContentEncoding: 'base64',
      ContentType: 'images/*',
      ACL: 'public-read',
    };

    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Location);
      }
    });
  });
};
