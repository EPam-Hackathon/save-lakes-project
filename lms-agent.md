## Objective: You are going to help me build the Lake Monitoring system

## Tech Stack

* **Front end**  React Native with Exp GO
* **AI Layer** Use Python [PyTorch / Ultralytics YOLO Core]
* **Services Layer** Python Fast API
* **Data Layer** Use Firebase for mobile backend as Service
* **File Storage** Use AWS S3 for File Storage

## Features

### Front End - React Native With Exp GO SDK

* **Registration Screen** Should be the first page to be displayed when the user is accessing for the first time. Allow users to register through email id. Store the user details in firebase users table with email, contact number, pincode and role as `users`.
* **Monitor Screen** Ability to view the images from the AWS S3. The images should also show the labelled outcome from the AI layer. The outcome should contain the algae boom detection, plastic debris identification. This page can only be accessed by app admin. roles can be obtained from Firebase SDK using the users table. 
* **Notification Center** This screen should include notifications from the Firebase database which has the list of messages that include information about campaigns that they are invited for. The firebase notifications table should have the required information. This can be accessed by all users. 
* **Organize a drive** This screen should show me a list of volunteers who are subscribed for cause, based on the location. Fetch the users using the firebase SDK . User should be able to create broadcast message and push it to all users.
* **User Login** The login page should have a Google OAuth authentication
* **Campaign Drive** Should be able to view the ongoing campaigns and RSVP to the event


### AI Layer - Use Python [PyTorch / Ultralytics YOLO Core]

* **Process an image** Read the image from raw bytes and call the YOLO Vision models to identify if the lake has algae_bloom or plastic_debris
* **Result Storage**  Store the result in a map and return the resutls to the calling function


### Services Layer - Python Fast API

* **Upload Image** - The service should take a image entity as input and store it to AWS S3 bucket
* **Return response** - Take all the images from the S3 storage and call the Vision module and get the resutls. Store the results to Firebase
* **Notification Service** - Service should read the users database and trigger notifications through Firebase notifications to all registered users 
* **RSVP handler** - Take the user email, campaign id as input and update the rsvp table in firebase with the acceptance
* **Team Readiness check** Take campaign as input fetch all users from the rsvp table for a given a campaign

### RBAC

_____________________________________________
|											|
|Screens		|	roles					|
|------------------------------------------ |
|Registration	|	Admin, User				|
|				|							|
|Monitor Screen	|	Admin					|
|				|							|
|Notification	|	Admin, User				|
|				|							|	
|Organize drive	|	Admin					|
|				|							|
|Login			|	User, Admin				|
|				|							|
|Campaigns		|	Users					|
|				|							|
|				|							|	
|_______________|____________________________|

