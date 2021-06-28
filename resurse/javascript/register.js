function checkPassword(password) {
    if (password.length < 8) {
        return false;
    }
    
    let specialChr = '!#$%.-*/?';
    let spec = false;
    let digit = false;
    let alpha = false;
    
    for (let i = 0; i < password.length; ++i) {
        if (specialChr.includes(password[i])) {
            spec = true;
        } else if (password[i] >= '0' && password[i] <= '9') {
            digit = true;
        } else if (password[i] >= 'a' && password[i] <= 'z' || password[i] >= 'A' && password[i] <= 'Z') {
            alpha = true;
        }
    }

    return spec && digit && alpha;
}

function checkEmail(email) {
    let pos = 0;
    let lg = email.length;

    while (pos < lg) {
        if (email[pos] == '@') {
            break;
        }

        ++pos;
    }

    if (pos == lg) {
        return false;
    }

    while (pos < lg) {
        if (email[pos] == '.') {
            break;
        }

        ++pos;
    }

    if (lg - pos < 2) {
        return false;
    }

    return true;
}

window.addEventListener("load", function() {
    document.getElementById("reg-form").onsubmit = function() {
        if (!checkPassword(document.getElementById("pass").value)) {
            alert("The password must contain at least 8 characters, including digits and special characters.")
            return false;
        }
        
        if (document.getElementById("pass").value != document.getElementById("rpass").value){
            alert("The two passwords don't match!");
            return false;
        }

        if (!checkEmail(document.getElementById("user-email").value)) {
            alert("The email is invalid. Try again.");
            return false;
        }

        return true;
    }
});