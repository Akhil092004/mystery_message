/* eslint-disable @typescript-eslint/no-unused-vars */
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import bcrypt from 'bcryptjs'

import { sendVerificationEmail } from "@/helpers/sendVerificationsEmail";
import { verify } from "crypto";



export async function POST(request :Request){
    await dbConnect()

    try {
        const {username,email,password} = await request.json()
        const existingUserVerifiedByUsername =  await UserModel.findOne({
            username,
            isVerified:true
        })

        if(existingUserVerifiedByUsername){
            return Response.json({
                success:false,
                message:"Username is already Taken"
            },{status:400})
        }

        const existingUserByEmail = await UserModel.findOne({email})
        const verifyCode = Math.floor(100000 + Math.random()*900000).toString()
        if(existingUserByEmail){
            if(existingUserByEmail.isVerified){
                return Response.json({
                    success:false,
                    message: "User with email exist with this email"
                },{status:500})
            }
            else{
                const hashedPass = await bcrypt.hash(password,10)
                existingUserByEmail.password = hashedPass;
                existingUserByEmail.verifyCode = verifyCode;
                existingUserByEmail.verifyCodeExpiry = new Date(Date.now() + 3600000)

                await existingUserByEmail.save()
            }
        }
        else{
            const hashedPass = await bcrypt.hash(password,10)
            const verifyCodeExpiry = new Date()

            verifyCodeExpiry.setHours(verifyCodeExpiry.getHours() + 1)

            const newUser =  new UserModel({
                username,
                email,
                password,
                hashedPass,
                verifyCode,
                verifyCodeExpiry,
                isVerified : false,
                isAcceptingMesaage : true,
                messages : []
            })

            await newUser.save()
        }


        //send verification
        const emailResponse = await sendVerificationEmail(
            email,
            username,
            verifyCode
        )

        if(!emailResponse.success){
            return Response.json({
                success:false,
                message: emailResponse.message
            },{status:500})
        }

        return Response.json({
            success:true,
            message: "User registered successfully. Please verify your email"
        },{status:500})

        
    } catch (error) {
        console.error("Error registering User", error)

        return Response.json({
            success : false,
            message : 'Error registering user'
        }, {status : 500})
    }
}