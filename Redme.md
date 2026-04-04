
## Project Workflow

1. **User Authentication**
   - A user registers or logs into the system using their email credentials.
   - After successful login or registration, 
   a **welcome email notification** is automatically sent to the user's registered email address using an email service integration.

2. **Transaction Creation**
   - The user initiates a financial transaction by providing their **Account ID** and the **recipient (From/To) Account ID**.
   - The system validates the provided account details before processing the transaction.

3. **Transaction Processing**
   - Once validated, the transaction is securely processed through backend APIs.
   - The transaction details including sender account, receiver account, and transaction amount are recorded.

4. **Database Storage**
   - All transaction data is stored in **MongoDB**, ensuring persistent storage and easy retrieval of financial records.

5. **Frontend Visualization**
   - The React-based user interface displays transaction history and account-related details in real-time.
   - Users can easily view their past transactions and financial activity through the dashboard.