const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImN1c2FAZ21haWwuY29tIiwic3ViIjoiYTE5YzFkZjMtN2Q0NS00N2I0LTgzYmItZjg3OWYxOTg3NTMzIiwicm9sZSI6IkNVU1RPTUVSIiwiaWF0IjoxNzg3MjEyMTU4LCJleHAiOjE3ODcyOTg1NTh9.Bpnm9LFqDs6eFc0V3UHKIHbSjBgH4vOCycn-UZrxtMs';

fetch('http://localhost:4000/api/v1/trips/book', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({"pickup":{"lat":10.782363,"lng":106.68937},"dropoff":{"lat":10.788475560854067,"lng":106.70361757278444},"vehicleType":"CAR_4","coupon_code":""})
}).then(async r => console.log(r.status, await r.text())).catch(console.error);
