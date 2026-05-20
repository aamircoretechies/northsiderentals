import { Container } from '@/components/common/container';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <Container>
        <div className="flex flex-col md:flex-row justify-center items-center gap-3 py-5">
          <div className="flex gap-2 font-normal text-sm">
            <span className="text-muted-foreground">{currentYear} &copy;</span>
            <a
              href="https://northsiderentals.com.au/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary-foreground hover:text-primary"
            >
              Northside Rentals
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
