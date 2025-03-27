import { Exclude } from 'class-transformer';
import {
  BeforeInsert,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '../../shared/modules/base/entity.base';
import { Content } from '../contents/content/content.entity';
import { Collaborator } from '../prepCourse/collaborator/collaborator.entity';
import { StudentCourse } from '../prepCourse/studentCourse/student-course.entity';
import { Role } from '../role/role.entity';
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

  @Column({ nullable: true })
  public socialName?: string;

  @Column({ default: false })
  public useSocialName: boolean;

  @Column()
  public phone: string;

  @Column()
  public gender: Gender;

  @Column()
  public birthday: Date;

  @Column({ nullable: true })
  public street?: string;

  @Column({ nullable: true })
  public number?: number;

  @Column({ nullable: true })
  public postalCode?: string;

  @Column({ nullable: true })
  public complement?: string;

  @Column({ nullable: true })
  public neighborhood?: string;

  @Column()
  public state: string;

  @Column()
  public city: string;

  @Column({ nullable: true })
  public about?: string;

  @Column()
  public lgpd: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'email_confirm_sended',
    nullable: true,
  })
  public emailConfirmSended?: Date;

  @ManyToOne(() => Role, (role) => role.users)
  role: Role;

  @OneToMany(() => Content, (content) => content.user)
  content: Content[];

  @OneToMany(
    () => StudentCourse,
    (studentCourse) => studentCourse.inscriptionCourse,
  )
  studentCourse: StudentCourse[];

  @OneToOne(() => Collaborator, (collaborator) => collaborator.user)
  collaborator?: Collaborator;

  @BeforeInsert()
  async hashPassword() {
    const bcrypt = await import('bcrypt');
    if (this.password) {
      // Verifica se a senha está presente
      this.password = await bcrypt.hash(this.password, 10); // Gere o hash com 10 salt rounds
    }
  }
}
