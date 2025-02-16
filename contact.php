<?php
// Check if the form was submitted using POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Sanitize and validate the form data

    // Get and clean the name
    $name = strip_tags(trim($_POST["name"]));
    $name = str_replace(array("\r", "\n"), array(" ", " "), $name);

    // Get and sanitize the email address
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);

    // Get and trim the message
    $message = trim($_POST["message"]);

    // Validate the inputs
    if (empty($name) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        // If validation fails, send a 400 (Bad Request) response
        http_response_code(400);
        echo "Please complete the form correctly and try again.";
        exit;
    }

    // Set the recipient email address.
    // Replace with your actual email address.
    $recipient = "md.daf001@gmail.com";

    // Create the email subject
    $subject = "New Contact Message from $name";

    // Build the email content.
    $email_content = "Name: $name\n";
    $email_content .= "Email: $email\n\n";
    $email_content .= "Message:\n$message\n";

    // Build the email headers.
    $email_headers = "From: $name <$email>";

    // Send the email.
    if (mail($recipient, $subject, $email_content, $email_headers)) {
        // Set a 200 (OK) response code and output success message.
        http_response_code(200);
        echo "Thank you! Your message has been sent.";
    } else {
        // Set a 500 (Internal Server Error) response code and output error message.
        http_response_code(500);
        echo "Oops! Something went wrong, and we couldn't send your message.";
    }
} else {
    // Not a POST request, set a 403 (Forbidden) response code.
    http_response_code(403);
    echo "There was a problem with your submission. Please try again.";
}
?>
