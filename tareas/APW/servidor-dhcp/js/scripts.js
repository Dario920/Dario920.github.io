document.addEventListener('DOMContentLoaded', () => {
    // 1. Smooth Scrolling para la Navegación
    document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            document.querySelector(targetId).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // 2. Observer para la Animación de Entrada de Secciones (Fade-in on scroll)
    const sections = document.querySelectorAll('.content-section');

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Añade la clase 'visible' cuando la sección entra en el viewport
                entry.target.classList.add('visible');
                // Opcional: deja de observar una vez que la animación ha ocurrido
                observer.unobserve(entry.target); 
            }
        });
    }, {
        rootMargin: '0px',
        threshold: 0.1 // Activa cuando el 10% de la sección es visible
    });

    sections.forEach(section => {
        observer.observe(section);
    });
});