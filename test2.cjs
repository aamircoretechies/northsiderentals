const fs = require('fs');

const payload = {
  "pickup_location_id": 9,
  "dropoff_location_id": 9,
  "pickup_date": "2026-05-15",
  "pickup_time": "10:00",
  "dropoff_date": "2026-05-20",
  "dropoff_time": "10:00",
  "category_id": 0,
  "age_id": 8,
  "campaigncode": "SAVE10",
  "promocode": "SAVE10",
  "couponcode": "SAVE10"
};

fetch('https://rcm-api.coretechiestest.org/api/v1/cars/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => {
  const cars = data?.data?.availablecars || [];
  const discounted = cars.filter(c => c.totalratebeforediscount > c.totalrateafterdiscount || c.discountrate > 0 || c.totaldiscountamount > 0 || (c.totalrate && c.totalrate > c.totalrateafterdiscount));
  console.log('Total cars:', cars.length);
  console.log('Discounted cars:', discounted.length);
  if (cars.length > 0) {
    console.log("First Car Stats:");
    console.log({
     totalrate: cars[0].totalrate,
     totalratebeforediscount: cars[0].totalratebeforediscount,
     totalrateafterdiscount: cars[0].totalrateafterdiscount,
     discountrate: cars[0].discountrate,
     totaldiscountamount: cars[0].totaldiscountamount
    });
  }
})
.catch(err => console.error(err));
