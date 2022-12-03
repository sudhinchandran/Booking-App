const sharp = require("sharp");

const logger = require("./logger.js");
const status = require("../utils/status");
module.exports = {
  resizeImage: async (base64Image, width) => {
    try {
      return new Promise(async (resolve, reject) => {
        logger.info("Resize Image");
        let parts = base64Image.split(";");
        let mimType = parts[0].split(":")[1];
        let imageData = parts[1].split(",")[1];
        var img = new Buffer.from(imageData, "base64");
        const resizedImage = await new Promise(async (resolve, reject) => {
          const resizedImageBuffer = sharp(img).resize(width).toBuffer();
          // const resizedImageBuffer = sharp(img).toFormat('webp').resize(width).webp({lossless:true}).toBuffer();
          resolve(resizedImageBuffer);
        });
        const newImage = await new Promise(async (resolve, reject) => {
          let resizedImageData = resizedImage.toString("base64");
          const resizedBase64 = `data:${mimType};base64,${resizedImageData}`;
          resolve(resizedBase64);
        });
        resolve(newImage);
      });
    } catch (err) {
      logger.error("Image Resize Error " + base64Image);
      return false;
    }
  },
};
