const fetch = require('node-fetch'); // make sure node-fetch is installed

// Getting values from environment variables (added in Netlify UI)
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

// Spotify token endpoint
const tokenUrl = 'https://accounts.spotify.com/api/token';

async function getAccessToken() {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refresh_token,
  });

  const auth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error_description);
  }

  return data.access_token;  // return the new access token
}

async function getNowPlaying() {
  try {
    const accessToken = await getAccessToken();
    console.log('Access Token:', accessToken);

    // Spotify API to get the current playing track
    const nowPlayingUrl = 'https://api.spotify.com/v1/me/player/currently-playing';

    const trackResponse = await fetch(nowPlayingUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const trackData = await trackResponse.json();
    console.log('Full Spotify Response:', JSON.stringify(trackData, null, 2));

    // if (!trackData.is_playing) {
    //   return { statusCode: 200, body: JSON.stringify({ message: 'No track is currently playing.' }) };
    // }

    const track = trackData.item;
    const trackInfo = {
      name: track.name,
      artists: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      album_image: track.album.images[0]?.url || '',
      progress_ms: trackData.progress_ms,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      track_url: track.external_urls.spotify,
      is_playing: trackData.is_playing,
      context: trackData.context || null
    };

    return {
      statusCode: 200,
      body: JSON.stringify(trackInfo),  // return track info in response
    };

  } catch (error) {
    console.error('Error caught:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

exports.handler = async () => {
  return await getNowPlaying();
};
