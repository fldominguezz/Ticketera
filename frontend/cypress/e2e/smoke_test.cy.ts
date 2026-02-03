describe('Smoke Test - Ticketera', () => {
  it('Debería cargar la página de login', () => {
    cy.visit('/login');
    cy.get('h2').should('contain', 'Acceso al Sistema');
  });

  it('Debería mostrar error con credenciales inválidas', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('error@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.get('.alert-danger').should('be.visible');
  });
});
