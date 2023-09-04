import { Geolocation } from 'src/modules/geo/geo.entity';

export const htmlGeo = (geo: Geolocation) => `<h2>Ola validador</h2>

<p>Temos um novo cursinho cadastrado no Você na Facul.</p>

<p>Nome: ${geo.name}</p>
<p>Endereço: 
${geo.street} - 
${geo.number}- 
${geo.complement}, ${geo.cep} - ${geo.state}, ${geo.city}, ${geo.neighborhood}</p>
<p>Telefone: ${geo.phone}</p>
<p>WhatAPP: ${geo.whatsapp}</p>
<p>Email: ${geo.email}</p>
<p>Email2: ${geo.email2}</p>
<p>Categoria do Cursinho: ${geo.category}</p>
<p>Site: ${geo.site}</p>
<p>Linkedin: ${geo.linkedin}</p>
<p>Youtube: ${geo.youtube}</p>
<p>Facebook: ${geo.facebook}</p>
<p>Instagram: ${geo.instagram}</p>
<p>Twitter: ${geo.twitter}</p>
<p>TikTok: ${geo.tiktok}</p>

<p>Usuário: ${geo.userFullName}</p>
<p>Email do Usuário: ${geo.userEmail}</p>
<p>Telefone do Usuário: ${geo.userPhone}</p>
<p>Vínculo com o Cursinho: ${geo.userConnection}</p>

<p>acesse o <a href="https://vcnafacul.com.br/">link</a> para valida-lo e que as pessoas consigam descobri-lo.</p>`;
