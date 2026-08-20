const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { DriversService } = require('./dist/drivers/drivers.service');
const { TripsService } = require('./dist/trips/trips.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const driversService = app.get(DriversService);
    console.log('Testing driversService.findAvailableDrivers...');
    const drivers = await driversService.findAvailableDrivers(106.68937, 10.782363, 'CAR_4', 3000, 5);
    console.log('Available Drivers found:', drivers.length);
    if (drivers.length > 0) {
      console.log('Driver ID:', drivers[0].user_id);
    }
  } catch (err) {
    console.error('Error in findAvailableDrivers:', err);
  } finally {
    await app.close();
  }
}
bootstrap();
