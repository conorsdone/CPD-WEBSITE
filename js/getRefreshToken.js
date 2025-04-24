const fetch = require("node-fetch");
const querystring = require("querystring");

const client_id = "d71a30997c3e4fd7945b8e8e2ea463cc"; // Your Client ID
const client_secret = "916606117a034129af873717c418315c"; // Your Client Secret
const refresh_token = "AQBluyAYZVby-13SyBs9muf22FWwHbJya3x5n_WbnJt4X2gZWu8j4fEKW72zn2Ugv1FODGE4Iht7NHNumd7ZDX-jTzCA3dXK_DRJ80qhp59R7ii2Md6HdRy2x2rD1LnIzbE"; // Your refresh token

const refreshAccessToken = async () => {
  const data = {
    grant_type: "refresh_token",
    refresh_token: refresh_token,
    client_id: client_id,
    client_secret: client_secret,
  };

  const tokenUrl = "https://accounts.spotify.com/api/token";

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: querystring.stringify(data),
  });

  const tokens = await response.json();
  console.log("New Access Token:", tokens.access_token);
};

refreshAccessToken();
