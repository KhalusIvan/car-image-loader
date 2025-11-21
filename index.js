const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const urlModule = require("url");

// Run `node index.js` to execute this script
const pageUrl = [
    //'http://american-wheels.cars.ua/img/car/252512',
    //'http://american-wheels.cars.ua/img/car/252511',
    //'http://american-wheels.cars.ua/img/car/252497',
    'https://americanwheels.com.ua/cars-catalog/skoda_fabia__car_2904',
];

// 'small' || 'medium' || null;
const newWebsiteDesiredType = null;

const generateFolder = (title) => {
    console.log("Title:", title);

    // Create output folder
    const folder = `images/${title}`;
    if (!fs.existsSync(folder)) {
        if (!fs.existsSync('images')) {
            fs.mkdirSync('images');
        }
        fs.mkdirSync(folder);
    }

    return folder;
}

const downloadImages = async (imgUrls, folder) => {
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
    }
}

async function downloadImageForOldWebsite(pageUrl) {
    try {
        // Load HTML
        const { data } = await axios.get(pageUrl);
        const $ = cheerio.load(data);

        const title = $("h1.car-title").text().trim();
        const folder = generateFolder(title);

        // Find and download images
        const imgUrls = [];
        $(".open-gallery img").each((_, img) => {
            const src = $(img).attr("src");
            if (src) imgUrls.push(urlModule.resolve(pageUrl, src)); // Convert relative → absolute
        });

        await downloadImages(imgUrls, folder)

    } catch (err) {
        console.error("Error:", err.message);
    }
}

async function downloadImageForNewWebsite(pageUrl) {
    try {
        // Load HTML
        const { data } = await axios.get(pageUrl);
        const $ = cheerio.load(data);

        const title = $("[class^='SingleCar_Title__']").text().trim();
        const description = $("[class^='SingleCar_Description__']").text().trim();
        let fullTitle = `${title}, ${description}`;
        if (newWebsiteDesiredType !== null) {
            fullTitle = `${newWebsiteDesiredType} - ${fullTitle}`
        }
        const folder = generateFolder(fullTitle);

        // Find and download images
        const imgUrls = [];
        $(".keen-slider img").each((_, img) => {
            const src = $(img).attr("src");
            if (src) imgUrls.push(urlModule.resolve(pageUrl, src)); // Convert relative → absolute
        });

        let imgUrlsMapped =  imgUrls.map((imgUrl) => {
            return imgUrl.replace('medium_', '').replace('small_')
        })

        if (newWebsiteDesiredType !== null) {
            imgUrlsMapped = imgUrlsMapped.map((imgUrl) => {
                const parts = imgUrl.split('/');
                parts[parts.length - 1] = `${newWebsiteDesiredType}_${parts[parts.length - 1]}`
                return parts.join('/');
            })
        }

        await downloadImages(imgUrlsMapped, folder)

    } catch (err) {
        console.error("Error:", err.message);
    }
}

async function downloadImagesFromUrl(pageUrls) {
    console.log(`Total amount of links - ${pageUrls.length}`)

    let counter = 0;

    for (const pageUrl of pageUrls) {
        if (pageUrl.includes('american-wheels.cars.ua')) {
            await downloadImageForOldWebsite(pageUrl)
        } else if (pageUrl.includes('americanwheels.com.ua')) {
            await downloadImageForNewWebsite(pageUrl)
        } else {
            console.log('Unknown domain')
        }

        counter++;
        console.log(`Proceeded ${counter}/${pageUrls.length}`)
    }

    console.log(`Finished`)
}

downloadImagesFromUrl(pageUrl);