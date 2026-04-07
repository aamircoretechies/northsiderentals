const fs = require('fs');

const payload = {
  "pickup_location_id": 9,
  "dropoff_location_id": 9,
  "pickup_date": "2026-05-15",
  "pickup_time": "10:00",
  "dropoff_date": "2026-05-20",
  "dropoff_time": "10:00",
  "category_id": 0,
  "age_id": 8
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
  fs.writeFileSync('./tmp_resp.json', JSON.stringify(data.data.availablecars, null, 2), 'utf8');
})
.catch(err => console.error(err));
