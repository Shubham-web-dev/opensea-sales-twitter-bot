const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');
const { ethers } = require('ethers');
const tweet = require('./tweet');

// Format tweet text
function formatAndSendTweet(event) {
    const tokenName = _.get(event, ['asset', 'name']);
    const openseaLink = _.get(event, ['asset', 'permalink']);
    const totalPrice = _.get(event, 'total_price');
    const usdValue = _.get(event, ['payment_token', 'usd_price']);
    const tokenSymbol = _.get(event, ['payment_token', 'symbol']);
    const isEthSale = (tokenSymbol === 'WETH' || tokenSymbol === 'ETH');
    const formattedEthPrice = ethers.utils.formatEther(totalPrice.toString());
    const formattedUsdPrice = (formattedEthPrice * usdValue).toFixed(2);


    let tweetText;
    if (isEthSale) {
        tweetText = `${tokenName} bought for ${formattedEthPrice}Ξ ($${formattedUsdPrice}) #NFT ${openseaLink}`;
    } else {
        tweetText = `${tokenName} bought for ${formattedUsdPrice} ${tokenSymbol} #NFT ${openseaLink}`;
    }
    console.log(tweetText);
    return tweet.tweet(tweetText);
}

// Poll OpenSea every 60 seconds & retrieve all sales for a given collection in either the time since the last sale OR in the last minute
setInterval(() => {
    const lastSaleTime = moment().subtract((process.env.REFRESH_AT/1000) + 10, "seconds").unix();
    axios.get('https://api.opensea.io/api/v1/events', {
        params: {
            collection_slug: process.env.OPENSEA_COLLECTION_SLUG,
            event_type: 'successful',
            occurred_after: lastSaleTime,
            only_opensea: 'false'
        }
    }).then((response) => {
        console.log(response);
        const events = _.get(response, ['data', 'asset_events']);
        const sortedEvents = _.sortBy(events, function(event) {
            var created = _.get(event, 'created_date');
            return new Date(created);
        })

        console.log(`${events.length} sales since the last one...`);
        _.each(sortedEvents, (event) => {
            return formatAndSendTweet(event);
        });
    }).catch((error) => {
        console.error(error);
    });
}, process.env.REFRESH_AT);
