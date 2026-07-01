import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(10, "Senha precisa ter pelo menos 10 caracteres")
    .max(128, "Senha muito longa"),
  fullName: z.string().min(2, "Nome muito curto").max(80, "Nome muito longo"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signUpFormSchema = signUpSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type SignUpFormInput = z.infer<typeof signUpFormSchema>;

export const signInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Senha precisa ter pelo menos 10 caracteres")
      .max(128, "Senha muito longa"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
