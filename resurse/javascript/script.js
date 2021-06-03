// cod pentru buton top

var topButton = document.getElementById("toplink");
// window.onscroll = function() {scrollFunction()};

// function scrollFunction() {
//     if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
//         topButton.style.display = "block";
//     } else {
//         topButton.style.display = "none";
//     }
// }

function topFunction() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

// cod pentru dark theme

window.addEventListener("load", function() {
    let theme = localStorage.getItem("theme");

    if (theme == "dark") {
        document.body.classList.add("dark");
        document.getElementsByClassName("main")[0].classList.add("dark-main");
        document.getElementsByClassName("change-theme")[0].classList.add("fas");
        document.getElementsByClassName("change-theme")[0].classList.add("fa-sun");
    }

    document.getElementsByClassName("change-theme")[0].onclick = function() {
        document.body.classList.toggle("dark");
        document.getElementsByClassName("main")[0].classList.toggle("dark-main");
        document.getElementsByClassName("change-theme")[0].classList.toggle("fas");
        document.getElementsByClassName("change-theme")[0].classList.toggle("fa-sun");

        if (document.body.classList.contains("dark")) {
            localStorage.setItem("theme", "dark");
        } else {
            localStorage.setItem("theme", "light");
        }
    }
});