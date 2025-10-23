import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MinusIcon, PlusIcon } from "lucide-react"
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,  
} from "./ui/select"

export function CreateCharacter() {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button variant="outline">Criar Personagem</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Criação de Personagem</DialogTitle>
            <DialogDescription>
              Preencha as informações de acordo com seu Personagem. Clique em salvar quando estiver pronto.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Nome</Label>
              <Input id="name-1" name="name" defaultValue="Chilli Rossello" />
            </div>
          <div className="flex gap-3">
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Escolha sua raça" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="dawrf">Anão</SelectItem>
                  <SelectItem value="elf">Elfo</SelectItem>
                  <SelectItem value="goblin">Goblin</SelectItem>
                  <SelectItem value="halfling">Halfling</SelectItem>
                  <SelectItem value="human">Humano</SelectItem>
                  <SelectItem value="lefou">Lefou</SelectItem>
                  <SelectItem value="minotaur">Minotauro</SelectItem>
                  <SelectItem value="qareen">Qareen</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Escolha sua classe" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="barbarian">Bárbaro</SelectItem>
                  <SelectItem value="bard">Bardo</SelectItem>
                  <SelectItem value="cleric">Clérigo</SelectItem>
                  <SelectItem value="druid">Druida</SelectItem>
                  <SelectItem value="wizard">Feiticeiro</SelectItem>
                  <SelectItem value="warrior">Guerreiro</SelectItem>
                  <SelectItem value="ladin">Ladino</SelectItem>
                  <SelectItem value="mage">Mago</SelectItem>
                  <SelectItem value="monk">Monge</SelectItem>
                  <SelectItem value="paladin">Paladino</SelectItem>
                  <SelectItem value="ranger">Patrulheiro</SelectItem>
                  <SelectItem value="samurai">Samurai</SelectItem>
                  <SelectItem value="pirate">Fanfarrão</SelectItem>
                  <SelectItem value="noble">Nobre</SelectItem>
              </SelectContent>
            </Select>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-3">
                <Label>Força</Label>
                <ButtonGroup>
                  <Button variant="outline" size="icon">
                    <PlusIcon />
                  </Button>
                  <ButtonGroupText>
                    <Label htmlFor="name">10</Label>
                  </ButtonGroupText>              
                  <Button variant="outline" size="icon">
                    <MinusIcon />
                  </Button>
                </ButtonGroup>
                </div>
                <div className="grid gap-3">
                <Label>Destreza</Label>
                <ButtonGroup>
                  <Button variant="outline" size="icon">
                    <PlusIcon />
                  </Button>
                  <ButtonGroupText>
                    <Label htmlFor="name">10</Label>
                  </ButtonGroupText>              
                  <Button variant="outline" size="icon">
                    <MinusIcon />
                  </Button>
                </ButtonGroup>
                </div>  
                <div className="grid gap-3">
                <Label>Constituição</Label>
                <ButtonGroup>
                  <Button variant="outline" size="icon">
                    <PlusIcon />
                  </Button>
                  <ButtonGroupText>
                    <Label htmlFor="name">10</Label>
                  </ButtonGroupText>              
                  <Button variant="outline" size="icon">
                    <MinusIcon />
                  </Button>
                </ButtonGroup>
                </div>  
                <div className="grid gap-3">
                <Label>Inteligência</Label>
                <ButtonGroup>
                  <Button variant="outline" size="icon">
                    <PlusIcon />
                  </Button>
                  <ButtonGroupText>
                    <Label htmlFor="name">10</Label>
                  </ButtonGroupText>              
                  <Button variant="outline" size="icon">
                    <MinusIcon />
                  </Button>
                </ButtonGroup>
                </div>  
                <div className="grid gap-3">
                <Label>Sbaedoria</Label>
                <ButtonGroup>
                  <Button variant="outline" size="icon">
                    <PlusIcon />
                  </Button>
                  <ButtonGroupText>
                    <Label htmlFor="name">10</Label>
                  </ButtonGroupText>              
                  <Button variant="outline" size="icon">
                    <MinusIcon />
                  </Button>
                </ButtonGroup>
                </div>  
                <div className="grid gap-3">
                <Label>Carisma</Label>
                <ButtonGroup>
                  <Button variant="outline" size="icon">
                    <PlusIcon />
                  </Button>
                  <ButtonGroupText>
                    <Label htmlFor="name">10</Label>
                  </ButtonGroupText>              
                  <Button variant="outline" size="icon">
                    <MinusIcon />
                  </Button>
                </ButtonGroup>
                </div>  
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
