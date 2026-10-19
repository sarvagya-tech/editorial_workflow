import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'editorial-workflow-default-secret-key-32chars',
  nodeEnv: process.env.NODE_ENV || 'development',
};
