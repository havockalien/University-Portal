import axios from 'axios';

async function testDeploy() {
  try {
    const res = await axios.post('https://university-portal-backend-3rnj.onrender.com/api/auth/admin-login', {
      username: 'admin',
      password: 'admin123'
    });
    console.log('Login Success:', res.data);
  } catch (err) {
    if(err.response) {
      console.log('Login Failed, Status:', err.response.status, err.response.data);
    } else {
      console.error('Network/Other Error:', err.message);
    }
  }
}

testDeploy();
