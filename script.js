// Slideshow functionality
let slideIndex = 1;
let slideInterval;

const photoNames = [];
for (let i = 1; i <= 12; i++) {
    photoNames.push(`Photo${i}.jpg`);
}

function showSlides(n) {
    let slides = document.getElementsByClassName("slide-fade");
    let dots = document.getElementsByClassName("dot");
    
    if (n > photoNames.length) slideIndex = 1;
    if (n < 1) slideIndex = photoNames.length;
    
    let imgElement = document.getElementById("slide-img");
    if (imgElement) {
        imgElement.src = `images/${photoNames[slideIndex - 1]}`;
        imgElement.alt = `Coffee Farm Image ${slideIndex}`;
    }
    
    if (dots.length > 0) {
        for (let i = 0; i < dots.length; i++) {
            dots[i].className = dots[i].className.replace(" active", "");
        }
        if (dots[slideIndex - 1]) {
            dots[slideIndex - 1].className += " active";
        }
    }
}

function changeSlide(n) {
    clearInterval(slideInterval);
    showSlides(slideIndex += n);
    startAutoSlide();
}

function currentSlide(n) {
    clearInterval(slideInterval);
    showSlides(slideIndex = n);
    startAutoSlide();
}

function startAutoSlide() {
    slideInterval = setInterval(() => {
        showSlides(slideIndex += 1);
    }, 4000);
}

function createDots() {
    const dotsContainer = document.getElementById("dots-container");
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        for (let i = 1; i <= photoNames.length; i++) {
            const dot = document.createElement("span");
            dot.className = "dot";
            dot.onclick = (function(index) {
                return function() { currentSlide(index); };
            })(i);
            dotsContainer.appendChild(dot);
        }
    }
}

// Mobile menu toggle
function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
}

// Modal functions
function showJoinForm() {
    const modal = document.getElementById('joinModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal() {
    const modal = document.getElementById('joinModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    alert('Thank you for joining Tathmini Coffee Gardens!\n\nYou will receive M-Pesa payment instructions via SMS shortly.\nMonthly subscription: KSh 999');
    closeModal();
    e.target.reset();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('joinModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Smooth scrolling for navigation links
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                // Close mobile menu if open
                const navLinks = document.querySelector('.nav-links');
                if (navLinks && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                }
            }
        });
    });
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', () => {
    createDots();
    showSlides(1);
    startAutoSlide();
    setupSmoothScrolling();
    
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});