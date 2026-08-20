const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { BookOrderDto, LocationDto } = require('./trips/dto/book-trip.dto');

const payload = {"pickup":{"lat":10.782363,"lng":106.68937},"dropoff":{"lat":10.788475560854067,"lng":106.70361757278444},"vehicleType":"CAR_4","coupon_code":""};

const instance = plainToInstance(BookOrderDto, payload);
validate(instance, { whitelist: true, transform: true }).then(errors => {
  if (errors.length > 0) {
    console.log("VALIDATION FAILED:", errors);
  } else {
    console.log("VALIDATION PASSED");
  }
});
