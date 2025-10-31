const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const urlModule = require("url");

const pageUrl = 'http://american-wheels.cars.ua/img/car/252511';

async function downloadImagesFromUrl(pageUrl) {
    try {
        // Load HTML
        const { data } = await axios.get(pageUrl);
        const $ = cheerio.load(data);

        const title = $("h1.car-title").text().trim();
        console.log("Title:", title);

        // Create output folder
        const folder = `images/${title}`;
        if (!fs.existsSync(folder)) {
            if (!fs.existsSync('images')) {
                fs.mkdirSync('images');
            }
            fs.mkdirSync(folder);
        }

        // Find and download images
        const imgUrls = [];
        $(".open-gallery img").each((_, img) => {
            const src = $(img).attr("src");
            if (src) imgUrls.push(urlModule.resolve(pageUrl, src)); // Convert relative → absolute
        });

        console.log("Found", imgUrls.length, "images");
        let counter = 1;

        for (const imgUrl of imgUrls) {
            const ext = path.extname(new URL(imgUrl).pathname) || ".jpg";
            const filename = `${counter}${ext}`;
            counter++;

            const filePath = path.join(folder, filename);
            const response = await axios.get(imgUrl, { responseType: "stream" });

            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            console.log("Downloaded:", filename);
        }

    } catch (err) {
        console.error("Error:", err.message);
    }
}

downloadImagesFromUrl(pageUrl);