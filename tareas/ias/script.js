function verIA(id) {
    const cajas = document.querySelectorAll('.caja-info');
    
    cajas.forEach(caja => {
        caja.classList.remove('visible');
    });
    
    const cajaMostrada = document.getElementById(id);
    if (cajaMostrada) {
        cajaMostrada.classList.add('visible');
    }
}
