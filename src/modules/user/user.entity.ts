import { Entity, Column, BeforeInsert, OneToOne, ManyToMany } from 'typeorm';
import { Gender } from './enum/gender';
import { UserRole } from '../user-role/user-role.entity';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { Exclude } from 'class-transformer';
import { Content } from '../contents/content/content.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  public email: string;

  @Column()
  @Exclude()
  public password: string;

  @Column()
  public firstName: string;

  @Column()
  public lastName: string;

  @Column()
  public phone: string;

  @Column()
  public gender: Gender;

  @Column()
  public birthday: Date;

  @Column()
  public state: string;

  @Column()
  public city: string;

  @Column({ nullable: true })
  public about?: string;

  @Column()
  public lgpd: boolean;

  @OneToOne(() => UserRole, (userRole) => userRole.user)
  userRole: UserRole;

  @ManyToMany(() => Content, (content) => content.user)
  content: Content;

  @BeforeInsert()
  async hashPassword() {
    const bcrypt = await import('bcrypt');
    if (this.password) {
      // Verifica se a senha está presente
      this.password = await bcrypt.hash(this.password, 10); // Gere o hash com 10 salt rounds
    }
  }
}
