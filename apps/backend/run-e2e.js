const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { JwtService } = require('@nestjs/jwt');
const { execSync } = require('child_process');

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwtService = app.get(JwtService);
  const customerToken = jwtService.sign({ sub: 'a19c1df3-7d45-47b4-83bb-f879f1987533', role: 'CUSTOMER' });
  const driverToken = jwtService.sign({ sub: '46944afa-b3a1-46c4-937d-dee321231b7e', role: 'DRIVER' });
  await app.close();
  
  const stdout = execSync(`node ../frontend/test-e2e.cjs ${customerToken} ${driverToken}`, { encoding: 'utf-8' });
  console.log(stdout);
}
test();
