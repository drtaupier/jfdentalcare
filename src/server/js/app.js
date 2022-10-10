window.onload = ()=>{
    stickyNav()
    footer()
}

const stickyNav =  () =>{
    window.addEventListener("scroll", () => {
        const header = document.getElementById("header");
        let headerPositionTop = header.getBoundingClientRect().top;
        let positionY = window.scrollY;
        if (headerPositionTop < positionY) {
          header.classList.add("sticky");
        } else {
          header.classList.remove("sticky");
          header.style.transition = "all 0.3s";
        }
      });
}

const footer = ()=>{
    const today = new Date;
    const year = today.getFullYear();
    const footer = document.getElementById("footer");
    const element = document.createElement('div');
    element.classList.add('footerCopy');
    element.innerHTML = `<h3>Copyright &copy; JF Dental Care - ${year}`;
    footer.appendChild(element);
}

