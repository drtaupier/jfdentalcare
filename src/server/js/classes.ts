class UI {
    footer = () => {
        const today = new Date;
        const year = today.getFullYear();
        const footer = document.querySelector('#footer') as HTMLInputElement;
        const element = document.createElement('div');
        element.classList.add('footerCopy');
        element.innerHTML = `<h3>Copyright &copy; JF Dental Care - ${year}`;
        footer.appendChild(element);
    }

    stickyNav = ():void=> {
        window.addEventListener("scroll", () => {
            const header = document.getElementById("header") as HTMLInputElement;
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

}

class formulario{
    
}

export default  UI;