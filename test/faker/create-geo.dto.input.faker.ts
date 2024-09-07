import { faker } from '@faker-js/faker';
import { CreateGeoDTOInput } from 'src/modules/geo/dto/create-geo.dto.input';

export function CreateGeoDTOInputFaker(): CreateGeoDTOInput {
  return {
    latitude: faker.location.latitude(), // Gera latitude aleatória
    longitude: faker.location.longitude(), // Gera longitude aleatória
    name: faker.company.name(), // Nome do local ou rua
    cep: faker.location.zipCode(), // CEP aleatório
    state: faker.location.state(), // Estado aleatório
    city: faker.location.city(), // Cidade aleatória
    neighborhood: faker.location.county(), // Bairro aleatório
    street: faker.location.street(), // Endereço de rua aleatório
    number: Math.random().toString(), // Número do prédio
    complement: '', // Complemento opcional
    phone: faker.phone.number(), // Telefone aleatórios
    whatsapp: faker.phone.number(), // WhatsApp aleatório
    email: faker.internet.email(), // Email aleatório
    email2: faker.internet.email(), // Email secundário aleatório
    category: faker.commerce.department(), // Categoria aleatória
    site: faker.internet.url(), // URL do site aleatório
    linkedin: faker.internet.url(), // LinkedIn aleatório
    youtube: faker.internet.url(), // YouTube aleatório
    facebook: faker.internet.url(), // Facebook aleatório
    instagram: faker.internet.url(), // Instagram aleatório
    twitter: faker.internet.url(), // Twitter aleatório
    tiktok: faker.internet.url(), // TikTok aleatório
    userFullName: faker.person.fullName(), // Nome completo do usuário
    userPhone: faker.phone.number(), // Telefone do usuário
    userConnection: faker.person.jobType(), // Conexão do usuário (aleatório)
    userEmail: faker.internet.email(), // Email do usuário
  };
}
