// Mocking dependensi internal
const { loginController } = require('../../src/controllers/authController');
const User = require('../../src/models/User'); // Model database
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Setup mock fungsi database dan library
jest.mock('../../src/models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Whitebox Testing: loginController', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: { email: 'tester@hendri.me', password: 'password123' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 3: Path Coverage (User not found)
  test('Branch eksekusi: return 404 jika user tidak ditemukan di DB', async () => {
    User.findOne.mockResolvedValue(null); // Mock DB return null

    await loginController(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'tester@hendri.me' });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  // Test Case 4: Path Coverage (Invalid Password)
  test('Branch eksekusi: return 401 jika bcrypt compare salah', async () => {
    User.findOne.mockResolvedValue({ email: 'tester@hendri.me', password: 'hashedPassword' });
    bcrypt.compare.mockResolvedValue(false); // Mock komparasi password gagal

    await loginController(req, res, next);

    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
  });

  // Test Case: Path Coverage (Success)
  test('Statement Coverage: Generate JWT dan return 200 saat sukses', async () => {
    const mockUser = { _id: 'user123', email: 'tester@hendri.me', password: 'hashedPassword' };
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mocked_token_string'); // Mock pembuatan token

    await loginController(req, res, next);

    expect(jwt.sign).toHaveBeenCalledWith({ id: mockUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ token: 'mocked_token_string' });
  });
});