const axios = require("axios");

const logger = require("./logger.js");
const constants = require("../utils/constants");
const status = require("../utils/status");
const getApi = require("../modules/api");

module.exports = {
  getLocationForInput: async (input) => {
    const GOOGLE_URL = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&fields=place_id,description&key=${constants.GOOGLE_API_KEY}`;
    const response = await getApi(GOOGLE_URL, "GET", ""); //Location
    let locations = [];
    if (response.data.status == "OK" && response.data.predictions) {
      locations = response.data.predictions.reduce((acc, cur) => {
        acc.push({ placeId: cur.place_id, placeName: cur.description });
        return acc;
      }, []);
    }
    return locations;
  },

  getLocationForPlaceId: async (input) => {
    const GOOGLE_URL = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      input
    )}&fields=address_components,geometry&key=${constants.GOOGLE_API_KEY}`;
    const response = await getApi(GOOGLE_URL, "GET", ""); //Location
    let locations = [];
    let locationsArray = [];
    if (response.data.status == "OK" && response.data.result) {
      locations = response.data.result.address_components;
      locationsArray["coordinates"] = response.data.result.geometry.location;
    }
    let ltn = [];
    locationsArray["address"] = locations.reduce((ls, lcn) => {
      if (lcn.types && lcn.types[0]) {
        ltn[lcn.types[0]] = lcn.long_name;
      } else {
        ltn = [];
      }
      return ltn;
    }, {});
    return locationsArray;
  },

  getNearByLocation: async (lat, lng, rad, keyword) => {
    const GOOGLE_URL = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location= ${lat},${lng}&radius=${rad}&keyword=${encodeURIComponent(
      keyword
    )}&key=${constants.GOOGLE_API_KEY}`;
    const response = await getApi(GOOGLE_URL, "GET", ""); //Location
    let locations = [];
    if (response.data.status == "OK" && response.data.results) {
      locations = response.data.results;
    }
    // response.data.next_page_token
    return locations;
  },

  getNearByPlace: async (input) => {
    const GOOGLE_URL = `https://maps.googleapis.com/maps/api/place/textsearch/json?input=${encodeURIComponent(
      input
    )}&inputtype=textquery&key=${constants.GOOGLE_API_KEY}`;
    const response = await getApi(GOOGLE_URL, "GET", ""); //Location
    let locations = [];
    if (response.data.status == "OK" && response.data.results) {
      locations = response.data.results;
    }
    // response.data.next_page_token
    return locations;
  },
  getAddress: async (lat, lng) => {
    const GOOGLE_URL = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&fields=formatted_address&key=${constants.GOOGLE_API_KEY}`;
    const response = await getApi(GOOGLE_URL, "GET", ""); //Location
    let address = [];
    if (
      response.data.status == "OK" &&
      response.data.results &&
      response.data.results[0] &&
      response.data.results[0].formatted_address
    ) {
      address = response.data.results[0].formatted_address;
    }
    return address;
  },
  getPlaceFromPlaceId: async (input) => {
    const GOOGLE_URL = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      input
    )}&fields=address_components,formatted_address,geometry,name,place_id&key=${
      constants.GOOGLE_API_KEY
    }`;
    const response = await getApi(GOOGLE_URL, "GET", ""); //Location
    let locations = [];
    let placeData;
    let placeId;
    let name;
    let address;
    let coordinates;
    let more;
    // console.log(response.data.result);
    if (response.data.status == "OK" && response.data.result) {
      locations = response.data.result.address_components;
      placeId = response.data.result.place_id;
      name = response.data.result.name;
      address = response.data.result.formatted_address;
      coordinates = [
        response.data.result.geometry.location.lng,
        response.data.result.geometry.location.lat,
      ];
      more = false;
    }

    let country = locations.filter(function (place) {
      return place.types[0] == "country";
    });
    let countryCode = "";
    let countryName = "";
    if (country.length) {
      countryCode = country[0].short_name;
      countryName = country[0].long_name;
    }
    placeData = {
      countryCode: countryCode,
      country: countryName,
      placeId: placeId,
      name: name,
      address: address,
      coordinates: coordinates,
      more: false,
    };

    return placeData;
  },
};
