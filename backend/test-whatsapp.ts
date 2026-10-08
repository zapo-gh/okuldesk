import { initialize, getStatus } from './src/modules/whatsapp/whatsapp.service';

async function run() {
  console.log('Init started');
  await initialize();
  console.log('Init done. Status:', getStatus());
  setTimeout(() => {
    console.log('Status after 5s:', getStatus());
    process.exit();
  }, 5000);
}

run();