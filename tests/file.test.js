require('./setup');
const request = require('supertest');

jest.mock('../src/config/cloudinary', () => ({
  uploader: {
    upload_stream: jest.fn((options, callback) => {
      const { Writable } = require('stream');
      const writable = new Writable({
        write(chunk, enc, cb) {
          cb();
        },
      });
      writable.on('finish', () => {
        callback(null, {
          secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/test.jpg',
          public_id: 'multimedia-search/test',
        });
      });
      return writable;
    }),
  },
}));

const app = require('../src/app');

const registerAndLogin = async () => {
  const user = { name: 'Jane Doe', email: 'jane@example.com', password: 'password123' };
  const res = await request(app).post('/api/auth/register').send(user);
  return res.body.token;
};

describe('Files', () => {
  it('blocks search without auth', async () => {
    const res = await request(app).get('/api/files/search');
    expect(res.status).toBe(401);
  });

  it('rejects unsupported file types on upload', async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('not a real file'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      });

    expect(res.status).toBe(400);
  });

  it('uploads a file and finds it via search, ranked by relevance', async () => {
    const token = await registerAndLogin();

    const uploadRes = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'sunset-beach')
      .field('tags', 'sunset,beach,vacation')
      .attach('file', Buffer.from('fake image data'), {
        filename: 'sunset.jpg',
        contentType: 'image/jpeg',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.file.url).toContain('cloudinary');

    const searchRes = await request(app)
      .get('/api/files/search?query=sunset')
      .set('Authorization', `Bearer ${token}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.count).toBe(1);
    expect(searchRes.body.results[0].name).toBe('sunset-beach');
  });

  it('increments view count when a file is fetched by id', async () => {
    const token = await registerAndLogin();

    const uploadRes = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake pdf data'), {
        filename: 'doc.pdf',
        contentType: 'application/pdf',
      });

    const fileId = uploadRes.body.file._id;

    const getRes = await request(app)
      .get(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.file.viewCount).toBe(1);
  });

  it('returns 404 for a non-existent file id', async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .get('/api/files/64b8f5e7e6a4f1a2b3c4d5e6')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
