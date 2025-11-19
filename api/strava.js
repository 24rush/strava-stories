import fs from 'fs';
import path from 'path';

const regex = /^https?:\/\/(www\.)?strava\.com\/activities\/(\d+)(\/.*)?$/;
const localActivities = { '15174937862': '15174937862.txt' }

function getActivityIdFromUrl(url) {
    const match = url.match(regex);
    return match ? match[2] : undefined;
}

function extractStravaData(data) {
    const match = data.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

    return (match) ? match[1] : "";
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return;
    }

    let strava_url = req.headers['url'];
    if (!strava_url) {
        res.status(500).json({ error: 'No url header found' });
        return;
    }

    let activityId = getActivityIdFromUrl(strava_url);
    if (!activityId) {
        res.status(500).json({ error: 'Invalid Strava URL' });
        return;
    }

    let actData = "";

    if (activityId in localActivities) {
        const filePath = path.join(process.cwd(), 'data', localActivities[activityId]);
        if (fs.existsSync(filePath)) {
            actData = extractStravaData(fs.readFileSync(filePath, 'utf8'));
        }
    }

    if (!actData) {
        const response = await fetch(strava_url);
        actData = extractStravaData(await response.text());
    }

    try {
        const jsonText = actData.trim()
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');

        const jsonData = JSON.parse(jsonText);

        let userData = {};
        userData['activity'] = jsonData.props.pageProps.activity;

        res.status(200).json(userData);
    } catch (err) {
        //console.error('Failed to parse JSON:', err);
        res.status(500).json({ error: 'Failed to parse JSON' });
    }
}