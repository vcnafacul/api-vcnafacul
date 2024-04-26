import { Exclude } from 'class-transformer';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  ManyToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { Content } from '../contents/content/content.entity';
import { UserRole } from '../user-role/user-role.entity';
import { Gender } from './enum/gender';

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

  @Column({ default: false })
  public collaborator: boolean;

  @Column({ default: null })
  public collaboratorDescription?: string;

  @Column({ default: null })
  public collaboratorPhoto?: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  public emailConfirmSended?: Date;

  @OneToOne(() => UserRole, (userRole) => userRole.user)
  userRole: UserRole;

  @ManyToMany(() => Content, (content) => content.user)
  content: Content;

  @BeforeUpdate()
  @BeforeInsert()
  async hashPassword() {
    const bcrypt = await import('bcrypt');
    if (this.password) {
      // Verifica se a senha está presente
      this.password = await bcrypt.hash(this.password, 10); // Gere o hash com 10 salt rounds
    }
  }
}
