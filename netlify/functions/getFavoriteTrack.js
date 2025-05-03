let favoriteTrack = {
  name: 'BUFFALO (feat. Shane Powers)',
  artists: 'Tyler, The Creator & Shane Powers',
  album: 'CHERRY BOMB',
  album_image: 'assets/cherrybombCover.jpg',
  duration_ms: 160000,
  is_playing: true,
  track_url: 'https://neal.fun'
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(favoriteTrack)
    };
  } else if (event.httpMethod === 'POST') {
    try {
      const newTrack = JSON.parse(event.body);
      favoriteTrack = { ...favoriteTrack, ...newTrack };
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(favoriteTrack)
      };
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid track data' })
      };
    }
  }
};