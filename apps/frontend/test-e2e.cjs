const io = require('socket.io-client');
const http = require('http');

const customerToken = process.argv[2];
const driverToken = process.argv[3];

console.log('Connecting Driver Socket...');
const driverSocket = io('http://localhost:4000', {
  auth: { token: driverToken },
  transports: ['websocket'],
});

driverSocket.on('connect', () => {
  console.log('Driver Socket Connected:', driverSocket.id);
  
  driverSocket.on('driver:trip_offer', (offer) => {
    console.log('✅ DRIVER RECEIVED TRIP OFFER!', offer);
    process.exit(0);
  });

  setTimeout(() => {
    console.log('Booking trip as Customer...');
    const data = JSON.stringify({
      pickup: { lat: 10.7828, lng: 106.6958 },
      dropoff: { lat: 10.7900, lng: 106.7000 },
      vehicleType: 'CAR_4',
      paymentMethod: 'CASH',
      couponCode: null
    });

    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/trips/book',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': 'Bearer ' + customerToken
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Book Response:', res.statusCode, body);
      });
    });
    req.write(data);
    req.end();
  }, 1000);
});

driverSocket.on('connect_error', (err) => {
  console.log('Socket Error:', err.message);
});
