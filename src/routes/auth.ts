import express from "express";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import db from "../config/db";

const router = express.Router();

/**
 * REGISTER
 */
router.post("/register", async (req, res) => {

   const {
      username,
      email,
      password
   } = req.body;

   try {

      // Encrypt password
      const hashedPassword =
         await bcrypt.hash(password, 10);

      const sql =
         "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";

      db.query(
         sql,
         [
            username,
            email,
            hashedPassword
         ],
         (err) => {

            if (err) {

               console.log(err);

               return res.status(500).json({
                  message:
                     "Registration failed"
               });
            }

            res.json({
               message:
                  "User registered successfully"
            });

         }
      );

   } catch (error) {

      console.log(error);

      res.status(500).json({
         message:
            "Server error"
      });

   }
});

/**
 * LOGIN
 */
router.post("/login", (req, res) => {

   const {
      email,
      password
   } = req.body;

   const sql =
      "SELECT * FROM users WHERE email = ?";

   db.query(
      sql,
      [email],
      async (
         err,
         results: any
      ) => {

         if (err) {

            return res.status(500).json({
               message:
                  "Server error"
            });
         }

         if (
            results.length === 0
         ) {

            return res.status(400).json({
               message:
                  "User not found"
            });
         }

         const user =
            results[0];

         // Compare password
         const isMatch =
            await bcrypt.compare(
               password,
               user.password
            );

         if (!isMatch) {

            return res.status(400).json({
               message:
                  "Invalid password"
            });
         }

         // Generate JWT
         const token =
            jwt.sign(
               {
                  id: user.id,
                  email: user.email
               },
               "secretkey",
               {
                  expiresIn: "1d"
               }
            );

         res.json({
            message:
               "Login successful",
            token
         });

      }
   );
});

export default router;