const { DataSource } = require('typeorm');
const dataSource = new DataSource({
  type: 'postgres',
  url: 'postgres://postgres:postgres@localhost:5432/crab_db',
  entities: ['dist/**/*.entity.js']
});
dataSource.initialize().then(async () => {
  try {
    const origin = { type: 'Point', coordinates: [106.68937, 10.782363] };
    const drivers = await dataSource.getRepository('DriverLocation')
        .createQueryBuilder('driverLocation')
        .innerJoin('driver_wallets', 'wallet', 'wallet.driver_id = "driverLocation"."user_id"')
        .innerJoin('driver_profiles', 'profile', 'profile.user_id = "driverLocation"."user_id"')
        .where('"driverLocation"."is_online" = :isOnline', { isOnline: true })
        .andWhere('"driverLocation"."active_trip_id" IS NULL')
        .andWhere('wallet.status = :status', { status: 'ACTIVE' })
        .andWhere('wallet.balance >= :minBalance', { minBalance: 100000 })
        .andWhere('profile.average_rating >= :minRating', { minRating: 3.5 })
        .andWhere('profile.vehicle_type = :vehicleType', { vehicleType: 'CAR_4' })
        .andWhere(
          'ST_DWithin("driverLocation"."current_location"::geography, ST_SetSRID(ST_GeomFromGeoJSON(:origin), 4326)::geography, :radius)',
          { origin: JSON.stringify(origin), radius: 3000 }
        )
        .limit(5)
        .getMany();
    console.log('TypeORM match:', drivers);
  } catch(e) {
    console.error(e);
  } finally {
    dataSource.destroy();
  }
});
