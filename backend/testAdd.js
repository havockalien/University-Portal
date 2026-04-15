import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAdd() {
  try {
    const resLogin = await axios.post('http://localhost:5000/api/auth/admin-login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = resLogin.data.token;
    console.log('Logged in', token);

    // Create a dummy file
    fs.writeFileSync('dummy.jpg', 'fake image content');

    const form = new FormData();
    form.append('name', 'Test Student');
    form.append('course', 'BBA');
    form.append('department', 'School of Business');
    form.append('phone', '1234567890');
    form.append('email', 'test2026@rvu.edu.in');
    form.append('batchYear', '2026');
    form.append('image', fs.createReadStream('dummy.jpg'));

    const resAdd = await axios.post('http://localhost:5000/api/students/add', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Added Student:', resAdd.data);

  } catch (err) {
    if(err.response) {
      console.log('Error', err.response.data);
    } else {
      console.error(err);
    }
  } finally {
    if(fs.existsSync('dummy.jpg')) fs.unlinkSync('dummy.jpg');
  }
}

testAdd();
