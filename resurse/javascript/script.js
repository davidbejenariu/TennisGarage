// cod pentru buton top

var topButton = document.getElementById("toplink");
window.onscroll = function() {scrollFunction()};

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