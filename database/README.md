# Database Outline
The SQL Database is focused on two tables. A users tables that are able to add, edit, and delete contacts in the contact table.




## Database Tables


**USERS**

|Users      |  Type                |Notes |
|-----------|----------------------|------|
|userID     |  INT                 | Automatically incremements by 1 for each additional user created |
|UserName   |  VARCHAR(50)         | Usernames able to be written up to length 50 |
|Password   |  VARCHAR(200)        | Hashed Password with variable length to fit requirements|
|Created At |  CURRENT_TIMESTAMP   | Timestamp generated on creation of user |



**CONTACTS**

|Contact    |  Type                |  |
|-----------|----------------------|--|
|userID     |  INT                 | Automatically incremements by 1 for each additional user created |
|First Name |  VARCHAR(50)         | First names able to written to length 50 |
|Last Name  |  VARCHAR(50)         | Last names able to written to length 50 |
|Email      |  VARCHAR(60)         | Email length up to 60 |
|Phone      |  VARCHAR(20)         | Phone up to length 20. Most numbers are 10 digit, but allows country codes and dashes |
|Created At |  CURRENT_TIMESTAMP   | Timestamp generated on creation of contact |
|Updated At |  CURRENT_TIMESTAMP   | Timestamp generated on update of contact |